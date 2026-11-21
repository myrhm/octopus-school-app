import { useLocation, useNavigate } from '@solidjs/router';
import { createEffect, onCleanup, onMount } from 'solid-js';
import { backend, school } from '../backend/client';
import { useSchoolSession } from '../backend/SchoolGate';

function requiresTeacher(path: string) {
  return [
    '/bank-soal',
    '/ujian',
    '/monitoring',
    '/nilai',
    '/pengaturan',
    '/pratinjau-siswa',
    '/komponen',
  ].some((root) => path === root || path.startsWith(root + '/'));
}

export default function TeacherAccessGuard() {
  const session = useSchoolSession();
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    if (!backend || session.checking() || session.user() || !requiresTeacher(location.pathname))
      return;
    session.setDestination(location.pathname + location.search + location.hash);
    navigate('/', { replace: true });
  });
  createEffect(() => {
    const destination = session.destination();
    if (!destination || session.checking()) return;
    if (session.user()) {
      if (!school()) return;
      session.setDestination('');
      navigate(destination);
    } else if (!session.open()) {
      session.show('login', true);
    }
  });

  onMount(() => {
    const guard = (event: MouseEvent) => {
      if (
        !backend ||
        session.user() ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self')
      )
        return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || !requiresTeacher(url.pathname)) return;
      event.preventDefault();
      event.stopPropagation();
      session.setDestination(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', guard, true);
    onCleanup(() => document.removeEventListener('click', guard, true));
  });
  return null;
}
