import { Page, Button } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function ManageCode() {
  // const breadcrumbs = [{ content: "QR codes", url: "/"}];

  // const componentRef = React.useRef(null);

  // const onBeforeGetContentResolve = React.useRef(null);

  // const [loading, setLoading] = React.useState(false);
  // const [text, setText] = React.useState("old boring text");

  // const handleAfterPrint = React.useCallback(() => {
  //   console.log("`onAfterPrint` called"); // tslint:disable-line no-console
  // }, []);

  // const handleBeforePrint = React.useCallback(() => {
  //   console.log("`onBeforePrint` called"); // tslint:disable-line no-console
  // }, []);

  // const handleOnBeforeGetContent = React.useCallback(() => {
  //   console.log("`onBeforeGetContent` called"); // tslint:disable-line no-console
  //   setLoading(true);
  //   setText("Loading new text...");

  //   return new Promise((resolve) => {
  //     onBeforeGetContentResolve.current = resolve;

  //     setTimeout(() => {
  //       setLoading(false);
  //       setText("New, Updated Text!");
  //       resolve();
  //     }, 2000);
  //   });
  // }, [setLoading, setText]);

  // const reactToPrintContent = React.useCallback(() => {
  //   return componentRef.current;
  // }, [componentRef.current]);

  // const handlePrint = useReactToPrint({
  //   content: reactToPrintContent,
  //   documentTitle: "AwesomeFileName",
  //   onBeforeGetContent: handleOnBeforeGetContent,
  //   onBeforePrint: handleBeforePrint,
  //   onAfterPrint: handleAfterPrint,
  //   removeAfterPrint: true
  // });

  // React.useEffect(() => {
  //   if (
  //     text === "New, Updated Text!" &&
  //     typeof onBeforeGetContentResolve.current === "function"
  //   ) {
  //     onBeforeGetContentResolve.current();
  //   }
  // }, [onBeforeGetContentResolve.current, text]);

  // return (
  //   <Page>
  //   <div>
  //     {loading && <p className="indicator">onBeforeGetContent: Loading...</p>}
  //     <Button onClick={handlePrint}>
  //       Print using a Functional Component with the useReactToPrint hook
  //     </Button>
  //     <ComponentToPrint ref={componentRef} text={text} />
  //   </div>
  //   </Page>
  // );

  return (
    <Page>
      <TitleBar
        title="Create new QR code"
        primaryAction={null}
      />
    </Page>
  )
}