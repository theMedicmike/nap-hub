import { Seal } from "./Seal";

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-crisis">
        <p>
          In crisis or worried about someone? Call or text <a href="tel:988">988</a>, then press 1 for the Veterans
          Crisis Line. In an emergency, call <a href="tel:911">911</a>.
        </p>
      </div>
      <div className="foot-in">
        <div className="org">
          <Seal size={22} />
          <span>Operation Whole Health</span>
        </div>
        <div className="disc">
          An open, early-stage framework offered for review and discussion — not medical advice.
          These statements have not been evaluated by the Food and Drug Administration. Nothing here
          is intended to diagnose, treat, cure, or prevent any disease. Always work with a licensed
          clinician before making any change to your care or medication.
        </div>
      </div>
    </footer>
  );
}
