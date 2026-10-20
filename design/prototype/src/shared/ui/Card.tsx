import type { HTMLAttributes } from "react";
import s from "./ui.module.css";
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
}
export function Card({ className = "", selected = false, ...props }: CardProps) {
  return (
    <div
      className={[s.card, selected ? s.cardSelected : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
export default Card;
