import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="wrap footer-inner">
        <div>
          © 2026 Rise Educação &bull; Ana Paula de Araújo. Todos os direitos reservados.
        </div>
        <div className="footer-links">
          <Link href="#">Termos de Uso</Link>
          <Link href="#">Privacidade</Link>
          <Link href="#">Suporte</Link>
        </div>
      </div>
    </footer>
  );
}
