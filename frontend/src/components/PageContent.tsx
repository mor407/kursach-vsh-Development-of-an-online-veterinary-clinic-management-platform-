import type { ReactNode } from "react";

type PageContentProps = {
  title: string;
  lead?: string;
  children?: ReactNode;
};

export function PageContent({ title, lead, children }: PageContentProps) {
  return (
    <main id="main" className="page page-standalone">
      <div className="container page-standalone-inner">
        <h1 className="page-standalone-title">{title}</h1>
        {lead ? <p className="page-standalone-lead">{lead}</p> : null}
        {children}
      </div>
    </main>
  );
}
