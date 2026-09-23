import { Link } from "react-router-dom";
import { PageContent } from "../components/PageContent";
import "../styles/pages/not-found.css";

export function NotFoundPage() {
  return (
    <PageContent title="404" lead="Страница не найдена.">
      <p className="page-placeholder">
        Возможно, ссылка устарела или введена с ошибкой.
      </p>
      <p className="page-placeholder">
        <Link className="text-link" to="/">
          Вернуться на главную
        </Link>
      </p>
    </PageContent>
  );
}
