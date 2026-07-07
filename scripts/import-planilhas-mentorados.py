# -*- coding: utf-8 -*-
"""
Importa as planilhas da Ana (Elite + Partiu 10k) para a tabela mentorados,
fazendo MERGE com os registros já criados pelo backfill do Asaas.

Regras:
- Match por CPF (só dígitos); sem CPF, por e-mail; sem e-mail, por nome normalizado
- Campos manuais da planilha (RG, endereço, datas, matéria/caneca, imersão,
  origem, renovação, forma de pagamento) entram por cima dos registros do Asaas
- valor_contrato/a_pagar do Asaas têm prioridade (verdade financeira);
  só usa o Total da planilha quando o registro não veio do Asaas
- Quem só existe na planilha (ex: pagou 100% via Pix) é criado do zero
- Datas em texto sem ano ("17 de fevereiro", "JANEIRO") vão pras notas

Pré-requisito: migrações 007 e 008 aplicadas + backfill-mentorados.mjs rodado.
Uso: python scripts/import-planilhas-mentorados.py
"""
import json
import re
import sys
import unicodedata
import urllib.request
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
ARQ_P10K = r"C:\Users\Henrique\Downloads\Lista de mentorados - Partiu 10k - 24.25.xlsx"
ARQ_ELITE = r"C:\Users\Henrique\Downloads\Lista Mentorados - Professores de Elite.xlsx"

env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
    if m:
        env[m.group(1)] = m.group(2).strip()

SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPA_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]


def supa(method, path, body=None):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/{path}",
        method=method,
        headers={
            "apikey": SUPA_KEY,
            "Authorization": f"Bearer {SUPA_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        raise RuntimeError(f"{method} {path} -> {e.code}: {detail}\npayload: {json.dumps(body, default=str)[:400]}")


def norm_texto(s):
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return None
    s = str(s).strip()
    return s if s and s.lower() not in ("nan", "none", "-") else None


def so_digitos(s):
    s = norm_texto(s)
    return re.sub(r"\D", "", s) if s else None


def norm_nome(s):
    s = norm_texto(s)
    if not s:
        return None
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


def parse_data(v):
    """datetime/date -> ISO; texto sem ano -> None (vai pras notas)."""
    if v is None or pd.isna(v):
        return None, None
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d"), None
    s = norm_texto(v)
    if not s:
        return None, None
    try:
        return pd.to_datetime(s, dayfirst=True).strftime("%Y-%m-%d"), None
    except Exception:
        return None, s  # texto tipo "17 de fevereiro" — preserva na nota


def parse_valor(v):
    s = norm_texto(v)
    if not s:
        return None
    s = re.sub(r"[R$\s]", "", s).replace(".", "").replace(",", ".")
    # cuidado com "3997" (sem decimais) vs "2247.5"
    try:
        f = float(s)
        return f if f > 0 else None
    except Exception:
        return None


def linha_para_registro(mentoria, status, aba, row, cols):
    """cols: dict campo_logico -> nome_da_coluna (ou índice posicional)."""
    def get(campo):
        col = cols.get(campo)
        if col is None:
            return None
        return row.get(col) if isinstance(col, str) else (row.iloc[col] if col < len(row) else None)

    nome = norm_texto(get("nome"))
    if not nome or re.match(r"^\d+\.?$", nome):
        return None

    inicio, inicio_txt = parse_data(get("inicio"))
    termino, termino_txt = parse_data(get("termino"))

    notas = []
    if inicio_txt:
        notas.append(f"início (planilha): {inicio_txt}")
    if termino_txt:
        notas.append(f"término (planilha): {termino_txt}")
    for extra_campo in ("obs1", "obs2"):
        v = norm_texto(get(extra_campo))
        if v:
            notas.append(v)
    notas.append(f"importado da aba: {aba}")

    return {
        "mentoria": mentoria,
        "status": status,
        "nome": nome,
        "email": norm_texto(get("email")),
        "telefone": norm_texto(get("telefone")),
        "cpf": norm_texto(get("cpf")),
        "rg": norm_texto(get("rg")),
        "endereco": norm_texto(get("endereco")),
        "cep": norm_texto(get("cep")),
        "imersao_rise": norm_texto(get("imersao")),
        "origem": norm_texto(get("origem")),
        "materia": norm_texto(get("materia")),
        "caneca": norm_texto(get("caneca")),
        "renovacao": norm_texto(get("renovacao")),
        "forma_pagamento": norm_texto(get("forma_pagamento")),
        "valor_contrato": parse_valor(get("valor")),
        "data_inicio": inicio,
        "data_termino": termino,
        "notas": " | ".join(notas),
    }


registros = []

# ---------- PARTIU 10K ----------
xls = pd.read_excel(ARQ_P10K, sheet_name=None, header=0)

df = xls["Partiu 10K ATIVOS"]
for _, row in df.iterrows():
    r = linha_para_registro("partiu10k", "ativo", "Partiu 10K ATIVOS", row, {
        "nome": "Inscrito", "forma_pagamento": "A pagar", "email": "E-mail",
        "telefone": "Telefone", "endereco": "Endereço", "cep": "CEP", "rg": "RG",
        "cpf": "CPF", "inicio": "Data da compra", "termino": "Data de finalização",
        "origem": "Origem do lead", "materia": "Matéria", "valor": "Total",
        "imersao": "Unnamed: 14",
    })
    if r:
        registros.append(r)

df = xls["Finalizados"]
for _, row in df.iterrows():
    r = linha_para_registro("partiu10k", "concluido", "Finalizados", row, {
        "nome": "Inscrito", "forma_pagamento": "A pagar", "email": "E-mail",
        "telefone": "Telefone", "endereco": "Endereço", "cep": "CEP", "rg": "RG",
        "cpf": "CPF", "inicio": "Data da compra",
        "origem": "Origem do lead", "materia": "Matéria", "valor": "Total",
        "obs1": "Unnamed: 13", "obs2": "Unnamed: 14",
    })
    if r:
        registros.append(r)

# Aba RENOVAÇÃO: cabeçalho quebrado (1ª linha virou header) — lê posicional
df = pd.read_excel(ARQ_P10K, sheet_name="RENOVAÇÃO", header=None)
for _, row in df.iterrows():
    r = linha_para_registro("partiu10k", "concluido", "RENOVAÇÃO", row, {
        "nome": 1, "forma_pagamento": 2, "email": 3, "telefone": 4, "endereco": 5,
        "cep": 6, "rg": 7, "cpf": 8, "inicio": 9, "obs1": 10, "materia": 11, "valor": 12,
    })
    if r:
        r["renovacao"] = "Renovação (aba RENOVAÇÃO)"
        registros.append(r)

# ---------- ELITE ----------
xls = pd.read_excel(ARQ_ELITE, sheet_name=None, header=0)

df = xls["Professores de Elite Ativos"]
for _, row in df.iterrows():
    r = linha_para_registro("elite", "ativo", "Elite Ativos (1.0)", row, {
        "nome": "Inscrito", "forma_pagamento": "A pagar", "email": "Email",
        "telefone": "Telefone", "rg": "RG", "cpf": "CPF", "endereco": "Endereço",
        "cep": "CEP", "inicio": "Data de início", "termino": "Data de término",
        "valor": "Valor", "caneca": "Caneca/Caneta", "renovacao": "Renovação",
        "obs1": "Duração/ meses", "obs2": "Valor 1º Ciclo",
    })
    if r:
        registros.append(r)

df = xls["Professores de Elite Finalizado"]
for _, row in df.iterrows():
    r = linha_para_registro("elite", "concluido", "Elite Finalizado (1.0)", row, {
        "nome": "Inscrito", "forma_pagamento": "A pagar", "email": "Email",
        "telefone": "Telefone", "rg": "RG", "cpf": "CPF",
        "inicio": "Data de início", "termino": "Data de término",
        "valor": "Valor", "renovacao": "Renovação",
    })
    if r:
        registros.append(r)

for aba, status in [("Professores de Elite 2.0", "ativo"), ("Elite 2.0 Finalizado", "concluido")]:
    df = xls[aba]
    for _, row in df.iterrows():
        r = linha_para_registro("elite", status, aba, row, {
            "nome": "Inscrito", "forma_pagamento": "A pagar", "email": "Email",
            "telefone": "Telefone", "endereco": "Endereço", "cep": "Cep", "rg": "RG",
            "cpf": "CPF", "imersao": "Imersão Rise", "inicio": "Data de início",
            "termino": "Data de término", "caneca": "Caneca", "origem": "Origem",
            "valor": "Valor", "renovacao": "Renovação",
        })
        if r:
            registros.append(r)

print(f"Planilhas lidas: {len(registros)} registros "
      f"(elite: {sum(1 for r in registros if r['mentoria']=='elite')}, "
      f"p10k: {sum(1 for r in registros if r['mentoria']=='partiu10k')})")

# ---------- MERGE com o banco ----------
existentes = supa("GET", "mentorados?select=id,mentoria,nome,email,cpf,asaas_customer_id&limit=2000") or []
print(f"No banco (pós-backfill Asaas): {len(existentes)} mentorados")

por_cpf, por_email, por_nome = {}, {}, {}
for e in existentes:
    key = (e["mentoria"], so_digitos(e.get("cpf")))
    if key[1]:
        por_cpf[key] = e
    key = (e["mentoria"], (e.get("email") or "").strip().lower())
    if key[1]:
        por_email[key] = e
    key = (e["mentoria"], norm_nome(e.get("nome")))
    if key[1]:
        por_nome[key] = e

atualizados = criados = 0
nao_casados_asaas = {e["id"] for e in existentes}

for r in registros:
    m = r["mentoria"]
    alvo = None
    cpf = so_digitos(r.get("cpf"))
    email = (r.get("email") or "").strip().lower()
    if cpf and (m, cpf) in por_cpf:
        alvo = por_cpf[(m, cpf)]
    elif email and (m, email) in por_email:
        alvo = por_email[(m, email)]
    elif norm_nome(r["nome"]) and (m, norm_nome(r["nome"])) in por_nome:
        alvo = por_nome[(m, norm_nome(r["nome"]))]

    if alvo:
        nao_casados_asaas.discard(alvo["id"])
        # registro do Asaas: mantém nome/valores financeiros de lá;
        # planilha manda nos campos manuais
        update = {k: v for k, v in r.items() if k not in ("mentoria", "nome", "valor_contrato") and v is not None}
        update["updated_at"] = datetime.utcnow().isoformat()
        supa("PATCH", f"mentorados?id=eq.{alvo['id']}", update)
        atualizados += 1
    else:
        # só existe na planilha (ex: Pix por fora, Eduzz antiga)
        supa("POST", "mentorados", [r])
        criados += 1

print(f"\n✅ Merge concluído: {atualizados} atualizados (casaram com Asaas), {criados} criados só da planilha.")
print(f"⚠️  {len(nao_casados_asaas)} registros do Asaas NÃO apareceram na planilha da Ana (revisar no painel).")
