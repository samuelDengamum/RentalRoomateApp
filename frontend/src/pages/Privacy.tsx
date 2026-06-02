import React from 'react';
import { useI18n } from '../lib/useI18n';
import '../styles/Legal.css';

const Privacy: React.FC = () => {
  const { tp } = useI18n();

  const sections = [
    {
      title: tp('1. Data We Collect'),
      body: tp('We collect profile data, listing data, messages, and operational metadata required to provide marketplace services.')
    },
    {
      title: tp('2. How We Use Data'),
      body: tp('We use your data for account management, trust and safety, matching users, and product improvement.')
    },
    {
      title: tp('3. Data Sharing'),
      body: tp('We only share data as needed to provide the service, comply with legal obligations, or protect users and the platform.')
    },
    {
      title: tp('4. Your Choices'),
      body: tp('You can update profile information, language and currency preferences, and communication preferences in your account settings.')
    },
    {
      title: tp('5. Retention and Security'),
      body: tp('We retain data only as needed and use reasonable technical and organizational safeguards to protect personal data.')
    }
  ];

  return (
    <section className="legal-page operations-page">
      <div className="legal-hero glass operations-card">
        <div className="legal-kicker-row">
          <p className="operations-kicker">{tp('Legal')}</p>
          <span className="legal-version">Version 2026-03</span>
        </div>
        <h1>{tp('Privacy Policy')}</h1>
        <p className="legal-subtitle">{tp('We retain data only as needed and use reasonable technical and organizational safeguards to protect personal data.')}</p>
      </div>

      <div className="legal-sections">
        {sections.map((item, index) => (
          <article
            key={item.title}
            className="legal-section-card glass operations-card"
            style={{ '--legal-delay': `${index * 90}ms` } as React.CSSProperties}
          >
            <div className="legal-section-heading">
              <span className="legal-section-index">{index + 1}</span>
              <h2>{item.title}</h2>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Privacy;
