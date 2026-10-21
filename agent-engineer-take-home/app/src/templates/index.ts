import type { ComponentType } from 'react';
import type { TemplateName } from '@/lib/analyze';
import type { TemplateProps } from './types';
import Bulk from './Bulk';
import Comparison from './Comparison';
import Fallback from './Fallback';
import Nontechnical from './Nontechnical';
import Spotlight from './Spotlight';

export const TEMPLATES: Record<TemplateName, ComponentType<TemplateProps>> = {
  nontechnical: Nontechnical,
  comparison: Comparison,
  bulk: Bulk,
  spotlight: Spotlight,
  fallback: Fallback,
};
