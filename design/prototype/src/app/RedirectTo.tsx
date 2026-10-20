import { Navigate, useParams } from "react-router-dom";
export function RedirectTo({
  to,
}: {
  to: (params: Record<string, string | undefined>) => string;
}) {
  const params = useParams();
  return <Navigate to={to(params)} replace />;
}
export default RedirectTo;
