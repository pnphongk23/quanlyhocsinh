import { useEffect } from "react";
import { Card } from "../shared/ui";
import { SaveStatus } from "../shared/SaveStatus";
export default function Placeholder({ title }: { title: string }) {
  useEffect(() => { document.title = title; }, [title]);
  return <section><h1>{title}</h1><Card><p>Màn hình đang được xây dựng.</p></Card><SaveStatus /></section>;
}
