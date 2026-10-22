import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { Button } from "./Button";
import { Fab } from "./Fab";
import { Field, Input } from "./Field";
import { LinkButton } from "./LinkButton";
import { Modal } from "./Modal";
import { PageHeader } from "./PageHeader";
import { Segmented } from "./Segmented";
import { Sheet } from "./Sheet";
import s from "./ui.module.css";

declare global {
  interface Window {
    __probeReopenModal?: () => void;
    __probeReopenSheet?: () => void;
    __probeCloseModal?: () => void;
    __probeCloseSheet?: () => void;
  }
}

function DialogMotionProbe() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [segment, setSegment] = useState("one");
  window.__probeReopenModal = () => setModalOpen(true);
  window.__probeReopenSheet = () => setSheetOpen(true);
  window.__probeCloseModal = () => setModalOpen(false);
  window.__probeCloseSheet = () => setSheetOpen(false);

  return (
    <main data-shared-ui-probe style={{ padding: 24 }}>
      <PageHeader title="Kiểm tra vùng bấm" backTo="/" />
      <p style={{ marginBlock: 16 }}>Các control dùng chung để đo bounding box.</p>
      <div className={s.pageActions}>
        <Button onClick={() => setModalOpen(true)}>Mở Modal</Button>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Mở Sheet
        </Button>
        <LinkButton to="/probe">Liên kết</LinkButton>
        <Fab label="Tạo mục" />
      </div>
      <div style={{ marginBlock: 16 }}>
        <Segmented
          label="Mục kiểm tra"
          options={[
            { value: "one", label: "Một" },
            { value: "two", label: "Hai" },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </div>
      <Field label="Trường nhập">
        <Input aria-label="Trường nhập" />
      </Field>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Probe Modal"
        footer={
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Hủy
          </Button>
        }
      >
        <p>Modal desktop.</p>
      </Modal>
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Probe Sheet"
        footer={
          <Button variant="secondary" onClick={() => setSheetOpen(false)}>
            Hủy
          </Button>
        }
      >
        <p>Sheet mobile.</p>
      </Sheet>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <DialogMotionProbe />
  </MemoryRouter>,
);
