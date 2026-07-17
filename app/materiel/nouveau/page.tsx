import Link from "next/link";
import MaterielForm from "@/components/MaterielForm";
import { IcBack } from "@/lib/icons";

export default function NouveauMateriel() {
  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/materiel" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Matériel</Link>
          <p className="eyebrow">Nouvel article</p>
          <h1>Ajouter au matériel</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <MaterielForm />
      </div>
    </div>
  );
}
