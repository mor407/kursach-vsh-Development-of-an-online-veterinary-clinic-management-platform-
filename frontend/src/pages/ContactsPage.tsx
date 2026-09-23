import { PageContent } from "../components/PageContent";
import "../styles/pages/contacts.css";

export function ContactsPage() {
  return (
    <PageContent
      title="Контакты"
      lead="Свяжитесь с нами удобным способом или приезжайте в клинику — мы рядом и на связи каждый день."
    >
      <section className="contacts-page" aria-label="Контактная информация">
        <div className="contacts-info">
          <article className="contact-card">
            <h3 className="card-title">Адрес</h3>
            <p className="card-text">г. Могилёв, ул. Свободы, 123</p>
            <p className="contacts-note">Вход со стороны внутреннего двора, рядом есть парковка.</p>
          </article>

          <div className="contacts-quick">
            <article className="contact-card">
              <h3 className="card-title">Телефон</h3>
              <p className="card-text">
                <a className="text-link" href="tel:+375291234567">
                  +375 (29) 123-45-67
                </a>
              </p>
            </article>

            <article className="contact-card">
              <h3 className="card-title">Email</h3>
              <p className="card-text">
                <a className="text-link" href="mailto:vetclinic@gmail.com">
                  vetclinic@gmail.com
                </a>
              </p>
            </article>
          </div>

          <article className="contact-card contact-card--schedule">
            <h3 className="card-title">Режим работы</h3>
            <ul className="contacts-hours" aria-label="Часы работы">
              <li>
                <span>Пн - Пт</span>
                <strong>08:00 - 21:00</strong>
              </li>
              <li>
                <span>Сб</span>
                <strong>09:00 - 18:00</strong>
              </li>
              <li>
                <span>Вс</span>
                <strong>10:00 - 16:00</strong>
              </li>
            </ul>
          </article>
        </div>

        <div className="contacts-map-card">
          <div className="contacts-map-head">
            <h3 className="section-title">Как добраться</h3>
            <div className="contacts-map-actions">
              <a
                className="btn btn-ghost btn-sm"
                href="https://www.openstreetmap.org/?mlat=53.9006&mlon=30.3347#map=16/53.9006/30.3347"
                target="_blank"
                rel="noreferrer"
              >
                Открыть карту
              </a>
              <a
                className="btn btn-primary btn-sm"
                href="https://maps.google.com/?q=53.9006,30.3347"
                target="_blank"
                rel="noreferrer"
              >
                Построить маршрут
              </a>
            </div>
          </div>
          <div className="contacts-map-wrap">
            <iframe
              title="Карта ветеринарной клиники"
              className="contacts-map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.openstreetmap.org/export/embed.html?bbox=30.3147%2C53.8906%2C30.3547%2C53.9106&layer=mapnik&marker=53.9006%2C30.3347"
            />
          </div>
          <p className="contacts-note">
            Если не получается найти вход, позвоните — администратор подскажет ориентиры.
          </p>
        </div>
      </section>
    </PageContent>
  );
}
