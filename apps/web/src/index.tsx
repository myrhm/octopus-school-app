import { render } from 'solid-js/web';
import App from './app/App';
import './styles/base.css';

const root = document.getElementById('root');

if (!root) throw new Error('Elemen root Octopus tidak ditemukan.');

render(() => <App />, root);
