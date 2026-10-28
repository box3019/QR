// Quiet version label next to the app name: small, muted, always left-to-right (also inside Hebrew), hidden until the version is known.
import React from 'react';
import { t } from '../i18n';
import { versionLabel, appTitle } from './version.mjs';
import { useVersion } from './useVersion';

export function AppVersion({ className = 'qr-ver' }: { className?: string }) {
  const v = useVersion(); if (!versionLabel(v)) return null;
  return <bdi dir="ltr" className={className + ' qr-ltr'} data-testid="app-version" title={t('about.version', { name: appTitle(v) })}>{versionLabel(v)}</bdi>;
}
