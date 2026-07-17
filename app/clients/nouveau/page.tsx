import Link from "next/link";
import ClientForm from "@/components/ClientForm";
import { IcBack } from "@/lib/icons";

export default function NouveauClient() {
  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/clients" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Clients</Link>
          <p className="eyebrow">Nouveau client</p>
          <h1>Créer une fiche client</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <ClientForm />
      </div>
    </div>
  );
}
