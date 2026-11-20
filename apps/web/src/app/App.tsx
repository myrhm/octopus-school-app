import { Route, Router } from '@solidjs/router';
import AppShell from './AppShell';
import OverviewPage from '../routes/OverviewPage';
import QuestionBankPage from '../routes/QuestionBankPage';
import NotFoundPage from '../routes/NotFoundPage';

export default function App() {
  return (
    <Router root={AppShell}>
      <Route path="/" component={OverviewPage} />
      <Route path="/bank-soal" component={QuestionBankPage} />
      <Route path="*404" component={NotFoundPage} />
    </Router>
  );
}
