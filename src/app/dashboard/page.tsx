export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-8">
      <h1 className="text-2xl font-bold text-white mb-6">TerminKI Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-gray-500 mb-1">Aktive Kunden</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-gray-500 mb-1">Termine heute</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-gray-500 mb-1">Crypto-Umsatz</p>
          <p className="text-3xl font-bold text-white">0,00 EUR</p>
        </div>
      </div>
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-gray-500">Verbinden Sie Ihre Supabase-Datenbank, um hier Ihre Statistiken zu sehen.</p>
      </div>
    </div>
  );
}

