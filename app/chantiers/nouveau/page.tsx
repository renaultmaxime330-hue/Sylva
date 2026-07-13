import Link from "next/link";
import ChantierForm from "@/components/ChantierForm";
import { IcBack } from "@/lib/icons";

export default function NouveauChantier() {
  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/chantiers" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Chantiers
          </Link>
          <p className="eyebrow">Nouveau</p>
          <h1>Créer un chantier</h1>
          <p className="sub">Remplis les informations. Seul le nom est obligatoire — le reste peut être complété plus tard.</p>
        </div>
      </div>

      <div className="card pad" style={{ maxWidth: 780 }}>
        <ChantierForm />
      </div>
    </div>
  );
}
