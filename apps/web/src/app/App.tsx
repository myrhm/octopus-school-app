import { AcceptInvitation } from '../backend/Members';
import { Monitoring, Grades } from '../backend/Reports';
import ExamManager from '../backend/ExamManager';
import ParticipantExam from '../backend/ParticipantExam';
import SchoolGate, { SchoolSession } from '../backend/SchoolGate';
import { backend } from '../backend/client';
import { Route, Router, useLocation } from '@solidjs/router';
import { Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import AppShell from './AppShell';
import OverviewPage from '../routes/OverviewPage';
import QuestionBankPage from '../routes/QuestionBankPage';
import NotFoundPage from '../routes/NotFoundPage';
import SettingsPage from '../routes/SettingsPage';
import UpcomingPage from '../routes/UpcomingPage';
import ComponentsPage from '../routes/ComponentsPage';
import { ThemeProvider } from './theme';
import QuestionImportPage from '../routes/QuestionImportPage';
import StudentPreviewPage from '../routes/StudentPreviewPage';
import PreviewShell from '../features/student-preview/PreviewShell';

function WorkspaceShell(props: ParentProps) {
  const location = useLocation();
  return (
    <Show
      when={location.pathname.startsWith('/pratinjau-siswa/')}
      fallback={<AppShell>{props.children}</AppShell>}
    >
      <PreviewShell>{props.children}</PreviewShell>
    </Show>
  );
}

function RouteShell(props: ParentProps) {
  const location = useLocation();
  return (
    <SchoolSession>
      {backend && (location.pathname.startsWith('/e/') || location.pathname === '/undangan') ? (
        props.children
      ) : backend ? (
        <WorkspaceShell>
          <Show
            when={location.pathname === '/'}
            fallback={<SchoolGate>{props.children}</SchoolGate>}
          >
            {props.children}
          </Show>
        </WorkspaceShell>
      ) : (
        <WorkspaceShell>{props.children}</WorkspaceShell>
      )}
    </SchoolSession>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router root={RouteShell}>
        <Route path="/" component={OverviewPage} />
        <Route path="/bank-soal" component={QuestionBankPage} />
        <Route path="/bank-soal/impor/:id" component={QuestionImportPage} />
        <Route path="/pratinjau-siswa/:id" component={StudentPreviewPage} />
        <Route path="/ujian" component={backend ? ExamManager : UpcomingPage} />
        <Route path="/e/:id" component={backend ? ParticipantExam : NotFoundPage} />
        <Route path="/monitoring" component={backend ? Monitoring : UpcomingPage} />
        <Route path="/nilai" component={backend ? Grades : UpcomingPage} />
        <Route path="/undangan" component={backend ? AcceptInvitation : NotFoundPage} />
        <Route path="/pengaturan" component={SettingsPage} />
        <Route path="/komponen" component={ComponentsPage} />
        <Route path="*404" component={NotFoundPage} />
      </Router>
    </ThemeProvider>
  );
}
