/**
 * Rodapé.
 *
 * Termos, Privacidade e Contato apontavam para href="#" no HTML original —
 * ou seja, não levavam a lugar nenhum. Mantidos como estão para não inventar
 * destino: quando as páginas existirem, é só trocar o href.
 */
export default function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <div>
          © Teacher Ana de Araújo 2026 ·{" "}
          <span style={{ color: "var(--ink-dim)" }}>@souteacherana</span>
        </div>
        <div>
          <a href="#">Termos</a> &nbsp;·&nbsp; <a href="#">Privacidade</a> &nbsp;·&nbsp;{" "}
          <a href="#">Contato</a>
        </div>
      </div>
    </footer>
  );
}
