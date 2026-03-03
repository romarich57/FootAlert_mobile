type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

type LegalDocument = {
  title: string;
  summary: string;
  policyVersion: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
  note?: string;
};

type LegalDocumentPageProps = {
  document: LegalDocument;
};

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <article className="content-card legal-document">
      <header>
        <h2>{document.title}</h2>
        <p>{document.summary}</p>
        <p className="legal-meta">
          <strong>Policy version:</strong> {document.policyVersion}
          <span aria-hidden="true"> · </span>
          <strong>Last updated:</strong> {document.lastUpdated}
        </p>
      </header>

      {document.sections.map(section => (
        <section key={section.title} className="legal-section">
          <h3>{section.title}</h3>
          {section.paragraphs.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets ? (
            <ul>
              {section.bullets.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {document.note ? <p className="legal-note">{document.note}</p> : null}
    </article>
  );
}
