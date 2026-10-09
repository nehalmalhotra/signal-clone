import { Modal } from "@/components/ui/Modal";

/** Same "Coming soon" message as the placeholder tabs (ComingSoon.tsx), but for actions that
 * live inside a real screen (call buttons, search, chat settings) rather than a whole tab. */
export function ComingSoonModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color: "var(--label-secondary)", fontSize: 14, padding: "8px 0 16px" }}>Coming soon</p>
    </Modal>
  );
}
