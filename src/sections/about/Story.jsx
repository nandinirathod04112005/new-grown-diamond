import { useCopy } from '@/i18n/useCopy.js';
import StoryTimeline from './StoryTimeline.jsx';
import COPY from './Story.copy.js';

/* The six chapters live in Story.copy.js, in all three languages. */
export default function Story() {
  const c = useCopy(COPY);
  return <StoryTimeline steps={c.steps} />;
}
