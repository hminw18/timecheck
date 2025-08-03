import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/ko';

dayjs.extend(weekOfYear);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(updateLocale);

// Set Korean locale
dayjs.locale('ko');

// Update locale to start week on Monday
dayjs.updateLocale('ko', {
  weekStart: 1 // 1 = Monday
});

// Console statement removed for production.isSameOrAfter === 'function');

export default dayjs;