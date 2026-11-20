import BookOpen from 'lucide-solid/icons/book-open';
import CalendarDays from 'lucide-solid/icons/calendar-days';
import ChartNoAxesCombined from 'lucide-solid/icons/chart-no-axes-combined';
import LayoutDashboard from 'lucide-solid/icons/layout-dashboard';
import Radio from 'lucide-solid/icons/radio';
import Settings from 'lucide-solid/icons/settings';

export const navigation = [
  { href: '/', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/bank-soal', label: 'Bank soal', icon: BookOpen },
  { href: '/ujian', label: 'Ujian', icon: CalendarDays },
  { href: '/monitoring', label: 'Monitoring', icon: Radio },
  { href: '/nilai', label: 'Nilai dan analisis', icon: ChartNoAxesCombined },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings },
];
