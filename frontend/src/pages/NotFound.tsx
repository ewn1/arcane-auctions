import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="empty">
      <h1>Página perdida no plano astral</h1>
      <p>Essa página não existe neste reino.</p>
      <Link to="/" className="btn">
        Voltar à vitrine
      </Link>
    </section>
  )
}
