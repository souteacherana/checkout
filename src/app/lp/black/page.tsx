import Image from "next/image";
import Contador from "./_components/Contador";
import LeadForm from "./_components/LeadForm";
import SeloData from "./_components/SeloData";
import {
  CARD_BONUS,
  CARD_WORKSHOPS,
  DEPOIMENTOS,
  FOTOS_IMERSAO,
  FUNDO_IMERSAO,
  FUNDO_SOBRE_DESKTOP,
  FUNDO_SOBRE_MOBILE,
  LOGO,
} from "./_lib/assets";

export default function BlackDaTeacher() {
  return (
    <main>
      <section className="hero">
        <div className="hero-coluna">
          <Image
            className="hero-logo"
            src={LOGO.src}
            alt={LOGO.alt}
            width={LOGO.width}
            height={LOGO.height}
            sizes="(max-width: 700px) 335px, 550px"
            loading="eager"
            fetchPriority="high"
          />
          <SeloData />
          <p className="hero-texto">
            <strong>Teacher, quer formar turmas e parar de depender de aulas individuais?</strong>
            <br />
            <br />
            Com o método certo, você aprende a lotar suas turmas e viver do que você gosta!
            <br />
            <br />
            Participe da <strong className="realce">BLACK DA TEACHER</strong> e conquiste o negócio
            que você sempre quis!
          </p>
          <p className="hero-chamada">
            Para <strong className="realce">VOCÊ MUDAR A SUA HISTÓRIA</strong> e aprender de uma vez
            por todas a empreender como <strong className="realce">PROFESSOR</strong>, inscreva-se
            abaixo:
          </p>
          <LeadForm />
        </div>
      </section>

      <Contador />

      <section className="bloco bloco-textura bloco-mentoria">
        <div className="bloco-inner">
          <h2 className="titulo-mentoria">
            <span>MENTORIA</span>
            <span>PARTIU</span>
            <span>10K</span>
          </h2>
          <div className="bloco-texto">
            <p>
              A <strong className="realce">Mentoria Partiu 10K </strong>é um programa criado para
              ajudar professores a estruturarem seus negócios, venderem com segurança e alcançarem
              suas metas financeiras.
            </p>
            <p>
              Durante a mentoria, você participa de <strong className="realce">encontros ao vivo</strong>{" "}
              com a Ana
              <br />e tem acesso a uma <strong className="realce">trilha completa</strong>, que vão
              desde os <strong className="realce">pilares de um professor valorizado </strong>até
              estratégias para{" "}
              <strong className="realce">escalar seus ganhos e criar infoprodutos</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="bloco bloco-textura bloco-textura-direita bloco-workshops">
        <div className="bloco-inner">
          <div className="bloco-arte">
            <h2 className="titulo-workshops">Workshops</h2>
            <Image
              src={CARD_WORKSHOPS.src}
              alt={CARD_WORKSHOPS.alt}
              width={CARD_WORKSHOPS.width}
              height={CARD_WORKSHOPS.height}
              sizes="(max-width: 700px) 335px, 360px"
            />
          </div>
          <div className="bloco-texto">
            <p>
              Na Black da Teacher, você garante <strong>acesso vitalício</strong> a todos os{" "}
              <strong>Workshops da Teacher Ana,</strong> treinamentos práticos que já transformaram
              a rotina e os resultados de centenas de professores.
            </p>
            <p>
              São aulas completas onde você aprende, na prática, a{" "}
              <strong>criar e vender seus próprios produtos digitais</strong>,{" "}
              <strong>lotar suas turmas com estratégia</strong>,{" "}
              <strong>usar o Instagram de forma inteligente</strong> e{" "}
              <strong>construir uma presença que atrai e converte alunos todos os dias</strong>.
            </p>
            <p>
              Tudo com a didática leve, objetiva e estratégica da Ana, para você sair do improviso e
              começar a viver de um negócio sólido, escalável e lucrativo.
            </p>
          </div>
        </div>
      </section>

      <section className="bloco bloco-textura">
        <div className="bloco-inner">
          <div className="bloco-arte">
            <Image
              src={CARD_BONUS.src}
              alt={CARD_BONUS.alt}
              width={CARD_BONUS.width}
              height={CARD_BONUS.height}
              sizes="(max-width: 700px) 335px, 360px"
            />
          </div>
          <div className="bloco-texto">
            <p>
              Além da Mentoria e do acesso vitalício aos Workshops, a Ana preparou{" "}
              <strong>bônus secretos</strong> que serão revelados{" "}
              <strong>apenas no dia da oferta</strong>.
            </p>
            <p>
              São presentes pensados pra acelerar ainda mais seus resultados e te colocar{" "}
              <strong>um passo à frente</strong> com ferramentas, aulas e vantagens que{" "}
              <strong>não estarão disponíveis em nenhum outro momento</strong>.
            </p>
          </div>
        </div>
      </section>

      {/*
        O WordPress tinha dois blocos iguais, um visível só no celular (com a
        galeria) e outro só no desktop (sem ela, porque as fotos já estão na
        arte de fundo). Aqui é um bloco só, e a galeria some por CSS no desktop.
      */}
      <section
        className="imersao"
        style={{ "--arte": `url("${FUNDO_IMERSAO}")` } as React.CSSProperties}
      >
        <h2 className="titulo-imersao">
          <span>INGRESSO</span>
          <span>IMERSÃO</span>
          <span>RISE</span>
        </h2>
        <div className="imersao-texto">
          <p>Ingresso para o</p>
          <p>
            <strong className="realce">MAIOR EVENTO PRESENCIAL</strong>
          </p>
          <p>para professores</p>
          <p>de idiomas</p>
        </div>
        <div className="imersao-fotos">
          {FOTOS_IMERSAO.map((foto) => (
            <Image
              key={foto.src}
              src={foto.src}
              alt={foto.alt}
              width={foto.width}
              height={foto.height}
              sizes="50vw"
            />
          ))}
        </div>
      </section>

      <section className="resultados">
        <h2>
          Resultados reais de
          <br />
          quem já participou
        </h2>
        <div className="resultados-galeria">
          {DEPOIMENTOS.map((depoimento) => (
            <Image
              key={depoimento.src}
              src={depoimento.src}
              alt={depoimento.alt}
              width={depoimento.width}
              height={depoimento.height}
              sizes="(max-width: 700px) 50vw, 250px"
            />
          ))}
        </div>
      </section>

      <section className="sobre">
        <div
          className="sobre-cartao"
          style={
            {
              "--fundo-desktop": `url("${FUNDO_SOBRE_DESKTOP}")`,
              "--fundo-mobile": `url("${FUNDO_SOBRE_MOBILE}")`,
            } as React.CSSProperties
          }
        >
          <div className="sobre-texto">
            <h2>
              Quem é a <br />
              Teacher Ana?
            </h2>
            <p className="sobre-abertura">Ana é esposa, mãe, empresária e mentora.</p>
            <p>
              Começou a viver de aulas particulares para se tornar mãe e poder passar mais tempo com
              suas filhas. Essa mudança de vida a fez estruturar um negócio de aulas particulares que
              se tornou sustentável e crescente ao longo dos anos.
              <br />
              <br />
              Desde 2021 no digital, ela auxilia professores particulares a estruturarem e se
              organizarem para crescer como professores empreendedores e poderem viver fazendo aquilo
              que mais amam sendo bem pagos por isso!
            </p>
          </div>
        </div>
      </section>

      <footer className="rodape">
        <Image
          src={LOGO.src}
          alt={LOGO.alt}
          width={LOGO.width}
          height={LOGO.height}
          sizes="(max-width: 700px) 170px, 547px"
        />
        <SeloData />
      </footer>
    </main>
  );
}
