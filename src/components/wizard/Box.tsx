// Boxed section with a clear title (MRT wizard panel look).
import React from 'react';

export function Box({ title, children, testid, actions }: any) {
  return <section className="mrt-wizard-panel qr-box" data-testid={testid}>
    <div className="qr-box-h"><h3 className="qr-box-title">{title}</h3>{actions}</div>
    <div className="qr-box-b">{children}</div>
  </section>;
}
