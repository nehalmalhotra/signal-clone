import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatPhoneForDisplay } from "@/lib/phone";

interface Props {
  phoneNumber: string;
  onEdit: () => void;
  onConfirm: () => void;
}

/** "Is your phone number above correct?" (StandaloneRegistration--PhoneNumber--Confirmation--*). */
export function PhoneConfirmModal({ phoneNumber, onEdit, onConfirm }: Props) {
  return (
    <Modal
      onClose={onEdit}
      footer={
        <>
          <Button variant="link" onClick={onEdit}>
            Edit number
          </Button>
          <Button variant="modal" onClick={onConfirm}>
            Yes
          </Button>
        </>
      }
    >
      <p style={{ padding: "16px 0 4px" }}>Is your phone number above correct?</p>
      <p style={{ paddingBottom: 16, fontWeight: 600 }}>{formatPhoneForDisplay(phoneNumber)}</p>
    </Modal>
  );
}
