// The brand name, set in Agrave Pro. That font has a single weight, so keep font-normal
// (a bold weight would be faked by the browser and look smeared).
export default function Wordmark({ className = "text-heading-md" }) {
  return <span className={`font-logo font-normal tracking-wide ${className}`}>Sentinel</span>;
}
