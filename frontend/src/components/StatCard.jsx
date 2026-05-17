export default function StatCard({ value, label }) {
  return (
    <div style={{
      background: '#1a1d2e', border: '1px solid #2d3748',
      borderRadius: '12px', padding: '1.5rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#63b3ed' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.3rem' }}>{label}</div>
    </div>
  )
}
