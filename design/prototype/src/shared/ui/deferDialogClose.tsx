import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

type ElementProps = Record<string, unknown> & { children?: ReactNode };

export function deferDialogClose(
  node: ReactNode,
  onClose: () => void,
  requestClose: (onClose: () => void) => void,
): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<ElementProps>;
    const nextProps: Partial<ElementProps> = {};
    if (element.props.children !== undefined) {
      nextProps.children = deferDialogClose(
        element.props.children,
        onClose,
        requestClose,
      );
    }
    if (element.props.onClick === onClose) {
      nextProps.onClick = () => requestClose(onClose);
    }
    return Object.keys(nextProps).length
      ? cloneElement(element, nextProps)
      : child;
  });
}
