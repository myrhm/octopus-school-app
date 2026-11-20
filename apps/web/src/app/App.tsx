import { Route, Router } from '@solidjs/router';
import AppShell from './AppShell';
import OverviewPage from '../routes/OverviewPage';
import QuestionBankPage from '../routes/QuestionBankPage';
import NotFoundPage from '../routes/NotFoundPage';
import SettingsPage from '../routes/SettingsPage';
import UpcomingPage from '../routes/UpcomingPage';
import ComponentsPage from '../routes/ComponentsPage';
import { ThemeProvider } from './theme';

export default function App() {
  return (
    <ThemeProvider>
      <Router root={AppShell}>
        <Route path="/" component={OverviewPage} />
        <Route path="/bank-soal" component={QuestionBankPage} />
        <Route path="/ujian" component={UpcomingPage} />
        <Route path="/monitoring" component={UpcomingPage} />
        <Route path="/nilai" component={UpcomingPage} />
        <Route path="/pengaturan" component={SettingsPage} />
        <Route path="/komponen" component={ComponentsPage} />
        <Route path="*404" component={NotFoundPage} />
      </Router>
    </ThemeProvider>
  );
}
