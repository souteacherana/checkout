import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserFromRequest } from '@/lib/api-auth';

const BUCKET = 'mentorados-docs';
const TIPOS = ['contrato', 'nota_fiscal'];
const MAX_BYTES = 4 * 1024 * 1024; // limite de body da Vercel é ~4,5MB
const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const PODE_VER = ['ANA', 'ADMIN', 'SUPERADMIN', 'EMMY'];
const PODE_EDITAR = ['ANA', 'ADMIN', 'SUPERADMIN'];

/** GET ?id={docId} — URL assinada (bucket privado) pra baixar o arquivo */
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !PODE_VER.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const { data: doc } = await supabaseAdmin
      .from('mentorado_docs')
      .select('storage_path, nome_arquivo')
      .eq('id', id)
      .single();
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300, { download: doc.nome_arquivo });
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'Erro ao gerar link' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: 'mentorado-docs' } });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}

/** POST multipart — anexa contrato/nota fiscal a um mentorado */
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !PODE_EDITAR.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const mentoradoId = String(form.get('mentorado_id') || '');
    const tipo = String(form.get('tipo') || '');
    const file = form.get('file');

    if (!mentoradoId || !TIPOS.includes(tipo) || !(file instanceof File)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 4 MB)' }, { status: 400 });
    }
    if (!MIMES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato não aceito (use PDF, JPG, PNG ou WebP)' }, { status: 400 });
    }

    const { data: mentorado } = await supabaseAdmin
      .from('mentorados')
      .select('id')
      .eq('id', mentoradoId)
      .single();
    if (!mentorado) return NextResponse.json({ error: 'Mentorado não encontrado' }, { status: 404 });

    const nomeLimpo = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
    const path = `${mentoradoId}/${tipo}-${Date.now()}-${nomeLimpo}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { error: dbErr } = await supabaseAdmin.from('mentorado_docs').insert([{
      mentorado_id: mentoradoId,
      tipo,
      nome_arquivo: file.name,
      storage_path: path,
      uploaded_by: user.email,
    }]);
    if (dbErr) {
      // Não deixa arquivo órfão se o registro falhar
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: 'mentorado-docs' } });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}

/** DELETE {id} — remove o anexo (arquivo + registro), pra reanexar corrigido */
export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || !PODE_EDITAR.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const { data: doc } = await supabaseAdmin
      .from('mentorado_docs')
      .select('id, storage_path')
      .eq('id', id)
      .single();
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });

    const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove([doc.storage_path]);
    if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });

    const { error: dbErr } = await supabaseAdmin.from('mentorado_docs').delete().eq('id', doc.id);
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: 'mentorado-docs' } });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}
