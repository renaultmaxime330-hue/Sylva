import Link from "next/link";
import EnginForm from "@/components/EnginForm";
import { IcBack } from "@/lib/icons";

export default function NouvelEngin() {
  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/engins" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Engins
          </Link>
          <p className="eyebrow">Nouvel engin</p>
          <h1>Ajouter une machine</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <EnginForm />
      </div>
    </div>
  );
}
