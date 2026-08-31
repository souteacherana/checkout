import Image from "next/image";
import CheckoutLink from "./CheckoutLink";
import { ANA_TICKET, ZOOM_SVG } from "../_lib/assets";

export default function OfferTicket() {
  return (
    <section className="offer-section" id="oferta">
      <div className="wrap">

        <div className="offer-ticket-container">

          <div className="offer-ticket-left">
            <h2 className="display-title">
              Tudo o que você precisa para transformar suas turmas em <em>produtos pedagógicos lucrativos.</em>
            </h2>

            <div className="ticket-benefits-list">
              <div className="t-benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>3 Horas de Imersão Prática ao Vivo</span>
              </div>

              <div className="t-benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>15 Dias de Acesso à Gravação</span>
              </div>

              <div className="t-benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <span>Do Planejamento até o Pedagógico</span>
              </div>

              <div className="t-benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>Método Aplicável a Qualquer Material Didático</span>
              </div>
            </div>
          </div>

          <div className="offer-ticket-right">
            <div className="ticket-card">

              <div className="ticket-top">
                <div className="ticket-logo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/lp/tnp/logo.svg" alt="Turmas na Prática" width="100" style={{ filter: 'invert(1)' }} />
                  <span className="ticket-brand">Turmas na Prática</span>
                </div>
                <div className="ticket-photo">
                  <Image
                    src={ANA_TICKET.src}
                    alt={ANA_TICKET.alt}
                    fill
                    sizes="140px"
                  />
                </div>
              </div>

              <div className="ticket-divider">
                <div className="cutout cutout-left"></div>
                <div className="divider-line">
                  <span>LOTE 01</span>
                  <span>TNP-001</span>
                </div>
                <div className="cutout cutout-right"></div>
              </div>

              <div className="ticket-body">
                <div className="ticket-info-grid">
                  <div>
                    <span className="t-lbl">DATA</span>
                    <span className="t-val">19/SET</span>
                  </div>
                  <div>
                    <span className="t-lbl">HORÁRIO</span>
                    <span className="t-val">15h</span>
                  </div>
                  <div>
                    <span className="t-lbl">AO VIVO NO:</span>
                    <span className="t-val" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      {/* SVG não passa pelo otimizador sem dangerouslyAllowSVG. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ZOOM_SVG} alt="Zoom" height="18" style={{ marginTop: '2px' }} />
                    </span>
                  </div>
                </div>

                <div className="ticket-price-box">
                  <span className="t-lbl">Apenas</span>
                  <div className="t-price">R$ 49,90</div>
                </div>

                <CheckoutLink className="btn-ticket-cta" location="ticket">
                  COMPRAR MEU INGRESSO &rarr;
                </CheckoutLink>
              </div>

              <div className="ticket-footer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a34d66" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <div>
                  <strong>Acesso imediato à Plataforma Anaflix</strong>
                  <p>Materiais de apoio e link de acesso já disponíveis.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
