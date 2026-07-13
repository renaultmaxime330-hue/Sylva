import Link from "next/link";
import JourneeForm from "@/components/JourneeForm";
import { IcBack } from "@/lib/icons";

export default function NouvelleJournee() {
  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/production" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Production
          </Link>
          <p className="eyebrow">Nouvelle journée</p>
          <h1>Saisir une journée</h1>
          <p className="sub">Choisis le chantier et la date, saisis le volume et les horaires. Le reste se calcule tout seul.</p>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 820 }}>
        <JourneeForm />
      </div>
    </div>
  );
}
