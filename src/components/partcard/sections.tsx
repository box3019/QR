// One component per friend's category (notes_extractor.py), in the card's fixed order.
import React from 'react';
import { SECTIONS } from '../../parts/breakdown.mjs';
import { CardSection } from './CardSection';

const S = (key: string) => SECTIONS.find((s) => s.key === key)!;
type P = { pg: any; part: any; card: any; details: boolean; goStep: (n: number) => void };
export const MaterialSection = (p: P) => <CardSection sec={S('material')} {...p} />;
export const HeatTreatSection = (p: P) => <CardSection sec={S('heat')} {...p} />;
export const CoatingsSection = (p: P) => <CardSection sec={S('coatings')} {...p} />;
export const PaintSection = (p: P) => <CardSection sec={S('paint')} {...p} />;
export const OtherProcessesSection = (p: P) => ((p.pg.procs || []).some((x: any) => !['Heat treat', 'Coating', 'Paint'].includes(x.process)) ? <CardSection sec={S('other')} {...p} /> : null);
export const MaskingSection = (p: P) => <CardSection sec={S('masking')} {...p} />;
export const SequenceSection = (p: P) => <CardSection sec={S('sequence')} {...p} />;
export const CARD_SECTIONS = [MaterialSection, HeatTreatSection, CoatingsSection, PaintSection, OtherProcessesSection, MaskingSection, SequenceSection];
