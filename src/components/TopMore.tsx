// Top bar More: History and Details sit here so the bar keeps one obvious row of commands.
import React from 'react';
import { t } from '../i18n';
import { MoreMenu } from './MoreMenu';

export function TopMore({ details, setDetails, showDetails, onHistory }: any) {
  return <MoreMenu topbar testid="btn-more" label={t('gd.more')} tip={t('tip.more')} items={[
    { testid: 'btn-history', label: t('top.history'), tip: t('tip.history'), onClick: onHistory },
    showDetails && { testid: 'btn-details', label: t('top.details'), tip: t('tip.details'), active: details, onClick: () => setDetails(!details) },
  ]} />;
}
