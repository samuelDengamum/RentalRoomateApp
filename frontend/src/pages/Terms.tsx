import React from 'react';
import { useI18n } from '../lib/useI18n';
import '../styles/Legal.css';

const Terms: React.FC = () => {
  const { tp } = useI18n();

  const sections = [
    {
      title: tp('1. Platform Use'),
      body: tp('You agree to use RentalHub lawfully and provide accurate information when creating listings, profiles, and requests.')
    },
    {
      title: tp('2. Safety and Conduct'),
      body: tp('Harassment, fraud, abuse, and impersonation are prohibited. We may suspend accounts that violate these rules.')
    },
    {
      title: tp('3. Listings and Content'),
      body: tp('You are responsible for content you upload. By posting content, you grant RentalHub rights to display it on the platform.')
    },
    {
      title: tp('4. Tours and Payments'),
      body: tp('Tour request status and payment terms are governed by platform policy and may vary by market.')
    },
    {
      title: tp('5. Liability'),
      body: tp('RentalHub acts as a marketplace intermediary and does not guarantee transaction outcomes between users.')
    }
  ];

  return (
    <section className="legal-page operations-page">
      <div className="legal-hero glass operations-card">
        <div className="legal-kicker-row">
          <p className="operations-kicker">{tp('Legal')}</p>
          <span className="legal-version">Version 2026-03</span>
        </div>
        <h1>{tp('Terms of Service')}</h1>
        <p className="legal-subtitle">{tp('You agree to use RentalHub lawfully and provide accurate information when creating listings, profiles, and requests.')}</p>
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

export default Terms;
