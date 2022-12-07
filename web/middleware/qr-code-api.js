/*
  The custom REST API to support the app frontend.
  Handlers combine application data from qr-codes-db.js with helpers to merge the Shopify GraphQL Admin API data.
  The Shop is the Shop that the current user belongs to. For example, the shop that is using the app.
  This information is retrieved from the Authorization header, which is decoded from the request.
  The authorization header is added by App Bridge in the frontend code.
*/

import { Shopify } from "@shopify/shopify-api";

import { QRCodesDB } from "../qr-codes-db.js";
import {
  getQrCodeOr404,
  getShopUrlFromSession,
  parseQrCodeBody,
  formatQrCodeResponse,
} from "../helpers/qr-codes.js";
import Barcode from "react-barcode";

const DISCOUNTS_QUERY = `
  query discounts($first: Int!) {
    codeDiscountNodes(first: $first) {
      edges {
        node {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
            ... on DiscountCodeBxgy {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
            ... on DiscountCodeFreeShipping {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

let session={"shop": "buffer-order.myshopify.com" , "accessToken": "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", isActive: ()=>{return true}}

export default function applyQrCodeApiEndpoints(app) {
  app.get("/api/discounts", async (req, res) => {
    // const session = await Shopify.Utils.loadCurrentSession(
    //   req,
    //   res,
    //   app.get("use-online-tokens")
    // );

    if (!session) {
      res.status(401).send("Could not find a Shopify session");
      return;
    }

    const client = new Shopify.Clients.Graphql(
      session.shop,
      session.accessToken
    );

    /* Fetch all available discounts to list in the QR code form */
    const discounts = await client.query({
      data: {
        query: DISCOUNTS_QUERY,
        variables: {
          first: 25,
        },
      },
    });

    res.send(discounts.body.data);
  });

  app.post("/api/qrcodes", async (req, res) => {
    try {
      const id = await QRCodesDB.create({
        ...(await parseQrCodeBody(req)),

        /* Get the shop from the authorization header to prevent users from spoofing the data */
        shopDomain: await getShopUrlFromSession(req, res),
      });
      const response = await formatQrCodeResponse(req, res, [
        await QRCodesDB.read(id),
      ]);
      res.status(201).send(response[0]);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/qrcodes/:id", async (req, res) => {
    const qrcode = await getQrCodeOr404(req, res);

    if (qrcode) {
      try {
        await QRCodesDB.update(req.params.id, await parseQrCodeBody(req));
        const response = await formatQrCodeResponse(req, res, [
          await QRCodesDB.read(req.params.id),
        ]);
        res.status(200).send(response[0]);
      } catch (error) {
        res.status(500).send(error.message);
      }
    }
  });

  app.get("/api/qrcodes", async (req, res) => {
    try {
      // const rawCodeData = await QRCodesDB.list(
      //   await getShopUrlFromSession(req, res)
      // );

      const {Order} = await import (`@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`);
      /* Get the order info */
      if (req.query.tabIndex == 'All') {
        const orders = await Order.all({
          session: session,
          status: "any",
        });

        console.log(orders);

        const response = await formatQrCodeResponse(req, res, orders);
        res.status(200).send(response);

        } else {
          const orders = await Order.all({
            session: session,
            fulfillment_status : req.query.tabIndex == 'Processing' ? 'unshipped,partial': 'shipped',
          });

        const response = await formatQrCodeResponse(req, res, orders);
        res.status(200).send(response);
      }

    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/qrcodes/:id", async (req, res) => {
    const qrcode = await getQrCodeOr404(req, res);

    if (qrcode) {
      const formattedQrCode = await formatQrCodeResponse(req, res, [qrcode]);
      res.status(200).send(formattedQrCode[0]);
    }
  });

  app.delete("/api/qrcodes/:id", async (req, res) => {
    const qrcode = await getQrCodeOr404(req, res);

    if (qrcode) {
      await QRCodesDB.delete(req.params.id);
      res.status(200).send();
    }
  });

  app.get("/api/printLabel", async (req, res) => {
    const {Page} = await import (`@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`);
    const pages= await Page.all({
      session: session,
    });

    let isExisted = -1;

    isExisted = pages.findIndex((item) => item.title == "print_label");

    const params = req.body;
    console.log(params);

    const html = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><link rel="stylesheet" href="./allwp.addictonline.co.il_files/labels.css">

    <style type="text/css">@import url(https://fonts.googleapis.com/css?family=Lato:300,400,700,900);</style><style type="text/css">.huntr-ext-add-job-container .add-job-container {
  padding: 25px 25px 100px 25px;
  max-height: 550px;
}
.huntr-ext-add-job-container .save-job-footer {
  width: 300px;
  position: absolute;
  bottom: 22px;
  background-color: #f3f1f5;
  border-top: 1px solid rgba(0,0,0,0.1);
  border-bottom: 1px solid rgba(0,0,0,0.1);
}
.huntr-ext-add-job-container .btn {
  margin-left: auto !important;
  margin-right: auto !important;
  margin-top: 10px !important;
  margin-bottom: 10px !important;
  width: 150px !important;
}
.huntr-ext-add-job-container .btn.waiting {
  pointer-events: none;
  cursor: not-allowed;
}
.huntr-ext-add-job-container .list-item {
  text-transform: capitalize;
}
.huntr-ext-parsed-jobs-container .no-results {
  font-size: 14px !important;
  color: rgba(25,4,69,0.7) !important;
  padding: 40px;
  text-align: center;
}
.huntr-ext-parsed-jobs-container .job-result {
  padding: 20px 25px;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  cursor: pointer;
}
.huntr-ext-parsed-jobs-container .job-result:hover {
  background-color: rgba(25,4,69,0.1);
}
.huntr-ext-parsed-jobs-container .job-title {
  font-size: 14px !important;
  font-weight: bold !important;
  color: #190445 !important;
  margin-bottom: 3px !important;
}
.huntr-ext-parsed-jobs-container .job-company,
.huntr-ext-parsed-jobs-container .job-location {
  max-width: 100px !important;
}
.huntr-ext-parsed-jobs-container .job-company {
  margin-right: 10px !important;
  font-weight: bold;
  color: rgba(25,4,69,0.9);
}
.huntr-ext-parsed-jobs-container .job-location {
  color: rgba(25,4,69,0.7);
}
.huntr-ext-parsed-jobs-container .job-description {
  color: rgba(25,4,69,0.4);
}
.huntr-ext-parsed-jobs-container .job-company,
.huntr-ext-parsed-jobs-container .job-description,
.huntr-ext-parsed-jobs-container .job-location {
  font-size: 13px;
}
.huntr-ext-parsed-jobs-container p {
  line-height: 15px !important;
  margin: 0 !important;
}
.huntr-ext-parsed-jobs-container span {
  margin: 0 !important;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}
.huntr-capitalize {
  text-transform: capitalize;
}
.huntr-error-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  cursor: pointer;
  background-color: #ff3569;
  padding: 15px;
  font-size: 12px;
  color: #fff;
  border-top: 1px solid rgba(0,0,0,0.1);
  text-align: center;
  font-family: Lato, sans-serif;
}
.huntr-ext-add-job-success-container {
  padding: 30px;
  text-align: center;
}
.huntr-ext-add-job-success-container .message {
  height: 180px !important;
  margin-top: 20px !important;
  border-bottom: 1px solid #eaeaea !important;
}
.huntr-ext-add-job-success-container .message p {
  font-size: 22px !important;
  line-height: 50px !important;
  text-align: center !important;
}
.huntr-ext-add-job-success-container .message .huntr-icon {
  font-size: 45px !important;
  color: rgba(74,74,74,0.2) !important;
}
.huntr-ext-add-job-success-container .huntr-footer {
  margin-top: 30px;
}
.huntr-ext-add-job-success-container .huntr-footer a.btn {
  color: #fff !important;
  width: 200px;
}
.huntr-ext-add-job-success-container .huntr-footer .btn img {
  position: absolute;
  left: 8px;
  top: 7px;
  width: 20px;
  height: 20px;
  border-radius: 20px;
}
.huntr-ext-settings-container {
  margin-top: 25px;
  font-family: 'Lato', sans-serif !important;
  font-size: 16px;
  text-align: center;
  color: #4a4a4a;
  height: 140px;
  margin-top: 50px;
}
.huntr-ext-settings-container p {
  line-height: 18px;
}
.huntr-ext-time-to-upgrade {
  padding: 35px;
  text-align: center;
  color: #6a4feb;
}
.huntr-ext-time-to-upgrade .huntr-icon {
  margin: 10px 0 40px 0;
  font-size: 60px;
  color: rgba(106,79,235,0.1);
}
#huntr-react-container-2 {
  font-smoothing: antialiased;
  -webkit-font-smoothing: antialiased;
  position: absolute;
  display: block !important;
  font-family: 'Lato', sans-serif;
}
#huntr-react-container-2 a,
#huntr-react-container-2 p,
#huntr-react-container-2 span,
#huntr-react-container-2 div {
  font-family: 'Lato', sans-serif !important;
}
#huntr-react-container-2 form {
  margin: 0;
  padding: 0;
}
#huntr-react-container-2 ::-webkit-scrollbar-button {
  width: 0px !important;
  height: 0px !important;
}
#huntr-react-container-2 ::-webkit-scrollbar-track {
  box-shadow: none !important;
  background-color: "white" !important;
}
#huntr-react-container-2 ::-webkit-scrollbar-thumb {
  background-color: rgba(24,0,69,0.1) !important;
  border: 4px solid #fff !important;
  border-radius: 100px !important;
}
#huntr-react-container-2 ::-webkit-scrollbar-thumb:hover {
  background-color: rgba(24,0,69,0.2) !important;
}
#huntr-react-container-2 ::-webkit-scrollbar-thumb:active {
  background-color: rgba(24,0,69,0.2) !important;
}
#huntr-react-container-2 ::-webkit-scrollbar {
  width: 13px !important;
  height: 20px !important;
}
#huntr-react-container-2 .huntr-title {
  font-size: 22px;
  font-weight: regular;
  color: #190445 !important;
}
#huntr-react-container-2 .huntr-description {
  font-size: 15px;
  font-weight: regular;
  color: rgba(25,4,69,0.7) !important;
}
#huntr-react-container-2 a {
  cursor: pointer;
}
#huntr-react-container-2 .centered {
  margin-right: auto;
  margin-left: auto;
  text-align: center;
}
#huntr-react-container-2 .field {
  position: relative;
}
#huntr-react-container-2 .field-container .huntr-icon {
  position: absolute;
  right: 5px;
  bottom: 14px;
  font-size: 16px;
  color: #d4d4d4;
  cursor: pointer;
}
#huntr-react-container-2 .field-container .input-image {
  width: 20px;
  height: 20px;
  position: absolute;
  right: 5px;
  bottom: 14px;
  border-radius: 100%;
  box-shadow: 0px 0px 4px rgba(0,0,0,0.1);
}
#huntr-react-container-2 .hide {
  visibility: hidden;
}
#huntr-react-container-2 .btn {
  font-family: 'Lato', sans-serif !important;
  border-radius: 4px !important;
  font-size: 14px;
  display: block !important;
  cursor: pointer !important;
  text-transform: capitalize !important;
  font-weight: 400 !important;
  letter-spacing: 0.2px !important;
  position: relative;
  transition: all 0.4s ease-out !important;
  text-align: center !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
  background-image: none !important;
  background-repeat: no-repeat !important;
  text-shadow: none !important;
  line-height: 37px;
  box-sizing: border-box !important;
}
#huntr-react-container-2 .btn .huntr-icon {
  position: absolute;
  right: 15px;
  top: 13px;
  color: rgba(255,255,255,0.4);
  font-size: 16px;
}
#huntr-react-container-2 .btn-purple {
  color: #fff;
  text-shadow: 0px 1px 4px rgba(0,0,0,0.1);
  background-color: #6a4feb;
}
#huntr-react-container-2 .btn-purple:hover {
  background-color: #8c35ff;
}
#huntr-react-container-2 .btn-purple:disabled {
  cursor: not-allowed;
  color: rgba(25,4,69,0.4) !important;
  background-color: rgba(25,4,69,0.2) !important;
}
#huntr-react-container-2 ul {
  margin: 0px;
  padding: 0px;
}
#huntr-react-container-2 ul li {
  list-style: none;
}
#huntr-react-container-2 .location-search .huntr-drop-down-menu span {
  font-size: 11px;
  display: inline-block;
}
#huntr-react-container-2 .truncate {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
#huntr-react-container-2 .huntr-drop-down-menu {
  color: #4a4a4a;
  font-family: 'Lato', sans-serif;
  background-color: #fff;
  position: absolute;
  width: 100%;
  border-radius: 4px;
  font-size: 13px;
  box-shadow: 0px 0px 4px rgba(0,0,0,0.1);
  z-index: 1;
  border: 1px solid #ddd;
  max-height: 250px;
  overflow-y: auto;
}
#huntr-react-container-2 .huntr-drop-down-menu .huntr-ddmenu-footer {
  padding: 10px 10px;
  border-bottom: 1px solid #eee;
  text-align: left;
  cursor: pointer;
}
#huntr-react-container-2 .huntr-drop-down-menu .huntr-ddmenu-footer .huntr-icon {
  margin-right: 10px;
}
#huntr-react-container-2 .huntr-logo img {
  width: 16px;
  position: relative;
  top: -5px;
}
#huntr-react-container-2 .huntr-ext-nav-menu {
  width: 100%;
  position: relative;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}
#huntr-react-container-2 .huntr-ext-nav-menu .nav-tooltip {
  display: none;
  position: absolute;
  background-color: #7f7b92;
  color: #fff;
  left: -45px;
  font-size: 11px;
  width: 90px;
  line-height: 30px;
  padding: 0px 15px;
  border-radius: 20px;
  top: -25px;
  text-align: center;
}
#huntr-react-container-2 .huntr-ext-nav-menu .nav-tooltip:before {
  content: '';
  display: block;
  width: 0;
  height: 0;
  position: absolute;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #7f7b92;
  top: 30px;
  left: 45px;
}
#huntr-react-container-2 .huntr-ext-nav-menu ul li {
  position: relative;
  padding: 0px;
  cursor: pointer;
  margin: 0px 31px 0px 0px;
  font-size: 17px;
  display: inline-block;
  color: #b5b5b5;
}
#huntr-react-container-2 .huntr-ext-nav-menu ul li a,
#huntr-react-container-2 .huntr-ext-nav-menu ul li span {
  line-height: 50px;
  vertical-align: middle;
}
#huntr-react-container-2 .huntr-ext-nav-menu ul li:first-child {
  margin-left: 20px;
}
#huntr-react-container-2 .huntr-ext-nav-menu ul li:last-child {
  margin: 0px;
}
#huntr-react-container-2 .huntr-ext-nav-menu ul li:hover {
  color: rgba(0,0,0,0.8);
}
#huntr-react-container-2 .huntr-ext-nav-menu ul li:hover .nav-tooltip {
  display: inline-block;
}
#huntr-react-container-2 .huntr-ext-top-menu {
  background-color: #f3f1f5;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  position: relative;
  width: 100%;
  color: rgba(0,0,0,0.25);
}
#huntr-react-container-2 .huntr-ext-top-menu img {
  max-width: 60px;
  box-sizing: content-box;
  padding: 12px 0px 10px 12px;
}
#huntr-react-container-2 p,
#huntr-react-container-2 span {
  text-shadow: none;
}
#huntr-react-container-2 p.huntr-icon,
#huntr-react-container-2 span.huntr-icon {
  font-family: 'simple-line-icons' !important;
}
#huntr-react-container-2 p.huntr-icon:before,
#huntr-react-container-2 span.huntr-icon:before {
  font-family: 'simple-line-icons' !important;
}
#huntr-react-container-2 h1 {
  font-family: 'Lato', sans-serif !important;
  text-transform: uppercase !important;
  color: #4a4a4a !important;
  letter-spacing: 5px !important;
  font-size: 16px !important;
  font-weight: 900;
}
#huntr-react-container-2 .huntr-ext-app-container {
  position: fixed;
  right: 30px;
  top: 30px;
  z-index: 100000;
  max-height: 600px;
  min-height: 300px;
}
#huntr-react-container-2 .huntr-ext-app-container .inner-container {
  height: 100%;
  background-color: #fff;
  width: 300px;
  box-shadow: 0px 0px 10px rgba(0,0,0,0.2);
  outline: 1px solid rgba(0,0,0,0.1);
}
#huntr-react-container-2 .huntr-ext-minimize {
  position: absolute;
  right: 10px;
  top: 0px;
  font-size: 35px;
  font-family: 'Lato', sans-serif;
  line-height: normal;
  transform: rotate(45deg);
  cursor: pointer;
  color: rgba(74,74,74,0.2);
  font-weight: 400;
  z-index: 1;
}
#huntr-react-container-2 .huntr-ext-minimize:hover {
  color: rgba(74,74,74,0.7);
}
#huntr-react-container-2 .editable-text-field {
  width: 100%;
}
#huntr-react-container-2 .huntr-ext-app-mini {
  background-color: #6a4feb;
  width: 50px;
  height: 50px;
  border-radius: 50px;
  position: fixed;
  z-index: 10000;
  bottom: 30px;
  right: 30px;
  cursor: pointer;
}
#huntr-react-container-2 .huntr-ext-app-mini:after {
  content: 'h';
}
#huntr-react-container-2 .huntr-ext-component-container h1 {
  text-align: center;
  margin: 60px 0px;
}
#huntr-react-container-2 .huntr-ext-component-container .drop-down-button {
  font-family: 'Lato', sans-serif !important;
  -webkit-appearance: none !important;
  outline: 0 !important;
  border-radius: 2px !important;
  box-sizing: border-box !important;
  font-family: 'Lato', sans-serif !important;
  width: 100% !important;
  padding: 12px 12px !important;
  font-size: 14px !important;
  color: rgba(74,74,74,0.9) !important;
  margin-bottom: 14px !important;
  font-weight: 400 !important;
  background-color: #fafafa !important;
  border: 1px solid #dcdcdc !important;
  transition: none !important;
  text-align: left !important;
  cursor: pointer !important;
}
#huntr-react-container-2 .huntr-ext-component-container input {
  font-size: 16px;
  height: 35px;
}
#huntr-react-container-2 .huntr-ext-component-container input::-webkit-input-placeholder {
  font-size: 16px !important;
  font-weight: 400 !important;
  font-family: 'Lato', sans-serif !important;
  color: rgba(24,0,69,0.3) !important;
}
#huntr-react-container-2 .huntr-ext-component-container textarea {
  font-size: 14px;
  height: 130px;
}
#huntr-react-container-2 .huntr-ext-component-container textarea::-webkit-input-placeholder {
  font-size: 14px !important;
  font-weight: 400 !important;
  font-family: 'Lato', sans-serif !important;
  color: rgba(24,0,69,0.3) !important;
}
#huntr-react-container-2 .huntr-ext-component-container input,
#huntr-react-container-2 .huntr-ext-component-container textarea {
  box-shadow: none;
  background-color: #fff;
  background-image: none !important;
  outline: 0;
  box-sizing: border-box;
  font-family: 'Lato', sans-serif !important;
  letter-spacing: 0px;
  width: 100%;
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
  box-shadow: none !important;
  border-bottom: 1px solid #eee !important;
  font-weight: 400 !important;
  margin: 0px !important;
  color: rgba(25,4,69,0.7) !important;
  border-radius: 0 !important;
  line-height: normal !important;
  padding: 20px 0 !important;
}
#huntr-react-container-2 .huntr-ext-component-container input.clean,
#huntr-react-container-2 .huntr-ext-component-container textarea.clean {
  border: none !important;
  height: 100%;
  padding: 0 !important;
}
#huntr-react-container-2 .huntr-ext-component-container input.clean:focus,
#huntr-react-container-2 .huntr-ext-component-container textarea.clean:focus,
#huntr-react-container-2 .huntr-ext-component-container input.clean::selection,
#huntr-react-container-2 .huntr-ext-component-container textarea.clean::selection {
  border-bottom: none !important;
}
#huntr-react-container-2 .huntr-ext-component-container input:focus,
#huntr-react-container-2 .huntr-ext-component-container textarea:focus,
#huntr-react-container-2 .huntr-ext-component-container input::selection,
#huntr-react-container-2 .huntr-ext-component-container textarea::selection {
  outline: 0;
  border-bottom: 1px solid #8c35ff !important;
  background-color: #fff !important;
}
#huntr-react-container-2 .huntr-ext-component-container input::selection,
#huntr-react-container-2 .huntr-ext-component-container textarea::selection {
  background-color: #8c35ff !important;
  color: #fff;
}
.huntr-loader ::after,
.huntr-loader ::before {
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}
.huntr-loader {
  display: block;
  height: 50px;
  width: 50px;
  animation: huntr-loader-1 3s linear infinite;
  -webkit-animation: huntr-loader-1 3s linear infinite;
}
@-webkit-keyframes huntr-loader-1 {
  0% {
    -webkit-transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
  }
}
.huntr-loader span {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  margin: auto;
  height: 50px;
  width: 50px;
  clip: rect(0px, 50px, 50px, 0);
  -webkit-animation: huntr-loader-2 1.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
  animation: huntr-loader-2 1.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
}
@-webkit-keyframes huntr-loader-2 {
  0% {
    -webkit-transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
  }
}
.huntr-loader span::before {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  margin: auto;
  height: 50px;
  width: 50px;
  border: 4px solid transparent;
  border-top: 4px solid #6a4feb;
  border-radius: 50%;
  -webkit-animation: huntr-loader-3 1.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
  animation: huntr-loader-3 1.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
}
@-webkit-keyframes huntr-loader-3 {
  0% {
    -webkit-transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
  }
}
.huntr-loader span::after {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  margin: auto;
  height: 50px;
  width: 50px;
  border: 4px solid rgba(106,79,235,0.2);
  border-radius: 50%;
}
.react-datepicker-wrapper,
.react-datepicker__input-container {
  display: block !important;
}
.huntr-date-picker-popper {
  font-size: 0.8rem;
}
.huntr-date-picker-popper .react-datepicker {
  font-family: "Lato", Helvetica, Arial, sans-serif !important;
  background-color: #fff !important;
  color: #180045 !important;
  border: 1px solid rgba(24,0,69,0.1) !important;
  border-radius: 8px !important;
  box-shadow: 0px 3px 7px -1px rgba(24,0,69,0.1) !important;
}
.huntr-date-picker-popper .react-datepicker__header {
  background-color: #fafafb !important;
  border-bottom: 1px solid rgba(24,0,69,0.1) !important;
}
.huntr-date-picker-popper .react-datepicker__day {
  color: rgba(24,0,69,0.6) !important;
}
.huntr-date-picker-popper .react-datepicker__day-name {
  color: rgba(24,0,69,0.7) !important;
}
.huntr-date-picker-popper .react-datepicker__day--disabled {
  color: rgba(24,0,69,0.21) !important;
}
.huntr-date-picker-popper .react-datepicker__day--keyboard-selected,
.huntr-date-picker-popper .react-datepicker__day--selected {
  background-color: #8c35ff !important;
  color: #fff !important;
}
.huntr-date-picker-popper .react-datepicker__today-button {
  background-color: rgba(24,0,69,0.02) !important;
  border-top: 1px solid rgba(24,0,69,0.1) !important;
}
.huntr-date-picker-popper .react-datepicker__time-container--with-today-button {
  right: -96px !important;
  border: 1px solid rgba(24,0,69,0.1) !important;
  border-radius: 8px !important;
  box-shadow: 0px 3px 7px -1px rgba(24,0,69,0.1) !important;
}
.huntr-date-picker-popper .react-datepicker__time-list-item {
  color: rgba(24,0,69,0.7) !important;
  height: 18px !important;
}
.huntr-date-picker-popper .react-datepicker__time-list-item::hover {
  background-color: #fafafb !important;
}
.huntr-date-picker-popper .react-datepicker__time-list-item--selected {
  background-color: #8c35ff !important;
  color: #fff;
}
.huntr-date-picker {
  display: block;
}
.react-datepicker__close-icon {
  width: auto !important;
}
.react-datepicker__close-icon::after {
  background-color: #180045 !important;
  width: 12px !important;
  height: 12px !important;
}
@-moz-keyframes huntr-loader-1 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-webkit-keyframes huntr-loader-1 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-o-keyframes huntr-loader-1 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes huntr-loader-1 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-moz-keyframes huntr-loader-2 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-webkit-keyframes huntr-loader-2 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-o-keyframes huntr-loader-2 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes huntr-loader-2 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-moz-keyframes huntr-loader-3 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-webkit-keyframes huntr-loader-3 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@-o-keyframes huntr-loader-3 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes huntr-loader-3 {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style><style type="text/css">/*!
 * Quill Editor v1.3.0
 * https://quilljs.com/
 * Copyright (c) 2014, Jason Chen
 * Copyright (c) 2013, salesforce.com
 */
#huntr-react-container-2 .ql-container span,
#huntr-react-container-2 .ql-container li,
#huntr-react-container-2 .ql-container ul,
#huntr-react-container-2 .ql-container div,
#huntr-react-container-2 .ql-container strong,
#huntr-react-container-2 .ql-container b,
#huntr-react-container-2 .ql-container h1,
#huntr-react-container-2 .ql-container h2,
#huntr-react-container-2 .ql-container h3,
#huntr-react-container-2 .ql-container p  {
  font-size: 14px;
  font-family: Lato, Arial, sans-serif !important;
  color: #180045 !important;
}

#huntr-react-container-2 .ql-container {
  box-sizing: border-box;
  font-family: Lato, Arial, sans-serif;
  font-size: 13px;
  height: 100%;
  margin: 0px;
  position: relative;
}
#huntr-react-container-2 .ql-container.ql-disabled .ql-tooltip {
  visibility: hidden;
}
#huntr-react-container-2 .ql-container.ql-disabled .ql-editor ul[data-checked] > li::before {
  pointer-events: none;
}
#huntr-react-container-2 .ql-clipboard {
  left: -100000px;
  height: 1px;
  overflow-y: hidden;
  position: absolute;
  top: 50%;
}
#huntr-react-container-2 .ql-clipboard p {
  margin: 0;
  padding: 0;
}
#huntr-react-container-2 .ql-editor {
  box-sizing: border-box;
  line-height: 1.42;
  height: 100% !important;
  outline: none;
  overflow-y: auto;
  padding: 12px 18px;
  tab-size: 4;
  -moz-tab-size: 4;
  text-align: left;
  white-space: pre-wrap;
  word-wrap: break-word;
}
#huntr-react-container-2 .ql-editor > * {
  cursor: text;
}
#huntr-react-container-2 .ql-editor p,
#huntr-react-container-2 .ql-editor ol,
#huntr-react-container-2 .ql-editor ul,
#huntr-react-container-2 .ql-editor pre,
#huntr-react-container-2 .ql-editor blockquote,
#huntr-react-container-2 .ql-editor h1,
#huntr-react-container-2 .ql-editor h2,
#huntr-react-container-2 .ql-editor h3,
#huntr-react-container-2 .ql-editor h4,
#huntr-react-container-2 .ql-editor h5,
#huntr-react-container-2 .ql-editor h6 {
  margin: 0;
  padding: 0;
  counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol,
#huntr-react-container-2 .ql-editor ul {
  padding-left: 1.5em;
}
#huntr-react-container-2 .ql-editor ol > li,
#huntr-react-container-2 .ql-editor ul > li {
  list-style-type: none;
}
#huntr-react-container-2 .ql-editor ul > li::before {
  content: '\n2022';
}
#huntr-react-container-2 .ql-editor ul[data-checked=true],
#huntr-react-container-2 .ql-editor ul[data-checked=false] {
  pointer-events: none;
}
#huntr-react-container-2 .ql-editor ul[data-checked=true] > li *,
#huntr-react-container-2 .ql-editor ul[data-checked=false] > li * {
  pointer-events: all;
}
#huntr-react-container-2 .ql-editor ul[data-checked=true] > li::before,
#huntr-react-container-2 .ql-editor ul[data-checked=false] > li::before {
  color: #777;
  cursor: pointer;
  pointer-events: all;
}
#huntr-react-container-2 .ql-editor ul[data-checked=true] > li::before {
  content: '\n2611';
}
#huntr-react-container-2 .ql-editor ul[data-checked=false] > li::before {
  content: '\n2610';
}
#huntr-react-container-2 .ql-editor li::before {
  display: inline-block;
  white-space: nowrap;
  width: 1.2em;
}
#huntr-react-container-2 .ql-editor li:not(.ql-direction-rtl)::before {
  margin-left: -1.5em;
  margin-right: 0.3em;
  text-align: right;
}
#huntr-react-container-2 .ql-editor li.ql-direction-rtl::before {
  margin-left: 0.3em;
  margin-right: -1.5em;
}
#huntr-react-container-2 .ql-editor ol li:not(.ql-direction-rtl),
#huntr-react-container-2 .ql-editor ul li:not(.ql-direction-rtl) {
  padding-left: 1.5em;
}
#huntr-react-container-2 .ql-editor ol li.ql-direction-rtl,
#huntr-react-container-2 .ql-editor ul li.ql-direction-rtl {
  padding-right: 1.5em;
}
#huntr-react-container-2 .ql-editor ol li {
  counter-reset: list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
  counter-increment: list-0;
}
#huntr-react-container-2 .ql-editor ol li:before {
  content: counter(list-0, decimal) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-1 {
  counter-increment: list-1;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-1:before {
  content: counter(list-1, lower-alpha) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-1 {
  counter-reset: list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-2 {
  counter-increment: list-2;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-2:before {
  content: counter(list-2, lower-roman) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-2 {
  counter-reset: list-3 list-4 list-5 list-6 list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-3 {
  counter-increment: list-3;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-3:before {
  content: counter(list-3, decimal) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-3 {
  counter-reset: list-4 list-5 list-6 list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-4 {
  counter-increment: list-4;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-4:before {
  content: counter(list-4, lower-alpha) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-4 {
  counter-reset: list-5 list-6 list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-5 {
  counter-increment: list-5;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-5:before {
  content: counter(list-5, lower-roman) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-5 {
  counter-reset: list-6 list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-6 {
  counter-increment: list-6;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-6:before {
  content: counter(list-6, decimal) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-6 {
  counter-reset: list-7 list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-7 {
  counter-increment: list-7;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-7:before {
  content: counter(list-7, lower-alpha) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-7 {
  counter-reset: list-8 list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-8 {
  counter-increment: list-8;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-8:before {
  content: counter(list-8, lower-roman) '. ';
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-8 {
  counter-reset: list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-9 {
  counter-increment: list-9;
}
#huntr-react-container-2 .ql-editor ol li.ql-indent-9:before {
  content: counter(list-9, decimal) '. ';
}
#huntr-react-container-2 .ql-editor .ql-indent-1:not(.ql-direction-rtl) {
  padding-left: 3em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-1:not(.ql-direction-rtl) {
  padding-left: 4.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-1.ql-direction-rtl.ql-align-right {
  padding-right: 3em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-1.ql-direction-rtl.ql-align-right {
  padding-right: 4.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-2:not(.ql-direction-rtl) {
  padding-left: 6em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-2:not(.ql-direction-rtl) {
  padding-left: 7.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-2.ql-direction-rtl.ql-align-right {
  padding-right: 6em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-2.ql-direction-rtl.ql-align-right {
  padding-right: 7.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-3:not(.ql-direction-rtl) {
  padding-left: 9em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-3:not(.ql-direction-rtl) {
  padding-left: 10.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-3.ql-direction-rtl.ql-align-right {
  padding-right: 9em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-3.ql-direction-rtl.ql-align-right {
  padding-right: 10.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-4:not(.ql-direction-rtl) {
  padding-left: 12em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-4:not(.ql-direction-rtl) {
  padding-left: 13.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-4.ql-direction-rtl.ql-align-right {
  padding-right: 12em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-4.ql-direction-rtl.ql-align-right {
  padding-right: 13.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-5:not(.ql-direction-rtl) {
  padding-left: 15em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-5:not(.ql-direction-rtl) {
  padding-left: 16.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-5.ql-direction-rtl.ql-align-right {
  padding-right: 15em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-5.ql-direction-rtl.ql-align-right {
  padding-right: 16.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-6:not(.ql-direction-rtl) {
  padding-left: 18em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-6:not(.ql-direction-rtl) {
  padding-left: 19.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-6.ql-direction-rtl.ql-align-right {
  padding-right: 18em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-6.ql-direction-rtl.ql-align-right {
  padding-right: 19.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-7:not(.ql-direction-rtl) {
  padding-left: 21em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-7:not(.ql-direction-rtl) {
  padding-left: 22.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-7.ql-direction-rtl.ql-align-right {
  padding-right: 21em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-7.ql-direction-rtl.ql-align-right {
  padding-right: 22.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-8:not(.ql-direction-rtl) {
  padding-left: 24em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-8:not(.ql-direction-rtl) {
  padding-left: 25.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-8.ql-direction-rtl.ql-align-right {
  padding-right: 24em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-8.ql-direction-rtl.ql-align-right {
  padding-right: 25.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-9:not(.ql-direction-rtl) {
  padding-left: 27em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-9:not(.ql-direction-rtl) {
  padding-left: 28.5em;
}
#huntr-react-container-2 .ql-editor .ql-indent-9.ql-direction-rtl.ql-align-right {
  padding-right: 27em;
}
#huntr-react-container-2 .ql-editor li.ql-indent-9.ql-direction-rtl.ql-align-right {
  padding-right: 28.5em;
}
#huntr-react-container-2 .ql-editor .ql-video {
  display: block;
  max-width: 100%;
}
#huntr-react-container-2 .ql-editor .ql-video.ql-align-center {
  margin: 0 auto;
}
#huntr-react-container-2 .ql-editor .ql-video.ql-align-right {
  margin: 0 0 0 auto;
}
#huntr-react-container-2 .ql-editor .ql-bg-black {
  background-color: #000;
}
#huntr-react-container-2 .ql-editor .ql-bg-red {
  background-color: #e60000;
}
#huntr-react-container-2 .ql-editor .ql-bg-orange {
  background-color: #f90;
}
#huntr-react-container-2 .ql-editor .ql-bg-yellow {
  background-color: #ff0;
}
#huntr-react-container-2 .ql-editor .ql-bg-green {
  background-color: #008a00;
}
#huntr-react-container-2 .ql-editor .ql-bg-blue {
  background-color: #06c;
}
#huntr-react-container-2 .ql-editor .ql-bg-purple {
  background-color: #93f;
}
#huntr-react-container-2 .ql-editor .ql-color-white {
  color: #fff;
}
#huntr-react-container-2 .ql-editor .ql-color-red {
  color: #e60000;
}
#huntr-react-container-2 .ql-editor .ql-color-orange {
  color: #f90;
}
#huntr-react-container-2 .ql-editor .ql-color-yellow {
  color: #ff0;
}
#huntr-react-container-2 .ql-editor .ql-color-green {
  color: #008a00;
}
#huntr-react-container-2 .ql-editor .ql-color-blue {
  color: #06c;
}
#huntr-react-container-2 .ql-editor .ql-color-purple {
  color: #93f;
}
#huntr-react-container-2 .ql-editor .ql-font-serif {
  font-family: Georgia, Times New Roman, serif;
}
#huntr-react-container-2 .ql-editor .ql-font-monospace {
  font-family: Monaco, Courier New, monospace;
}
#huntr-react-container-2 .ql-editor .ql-size-small {
  font-size: 0.75em;
}
#huntr-react-container-2 .ql-editor .ql-size-large {
  font-size: 1.5em;
}
#huntr-react-container-2 .ql-editor .ql-size-huge {
  font-size: 2.5em;
}
#huntr-react-container-2 .ql-editor .ql-direction-rtl {
  direction: rtl;
  text-align: inherit;
}
#huntr-react-container-2 .ql-editor .ql-align-center {
  text-align: center;
}
#huntr-react-container-2 .ql-editor .ql-align-justify {
  text-align: justify;
}
#huntr-react-container-2 .ql-editor .ql-align-right {
  text-align: right;
}
#huntr-react-container-2 .ql-editor .ql-embed-selected {
  border: 1px solid #777;
  user-select: none;
}
#huntr-react-container-2 .ql-editor.ql-blank::before {
  color: rgba(25,4,69,0.4);
  content: attr(data-placeholder);
  font-style: normal;
  pointer-events: none;
  position: absolute;
}
#huntr-react-container-2 .ql-snow.ql-toolbar:after,
#huntr-react-container-2 .ql-snow .ql-toolbar:after {
  clear: both;
  content: '';
  display: table;
}
#huntr-react-container-2 .ql-snow.ql-toolbar button,
#huntr-react-container-2 .ql-snow .ql-toolbar button {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-block;
  float: left;
  height: 24px;
  padding: 3px 5px;
  width: 28px;
  box-shadow: none;
  min-height: 1em;
}
#huntr-react-container-2 .ql-snow.ql-toolbar button svg,
#huntr-react-container-2 .ql-snow .ql-toolbar button svg {
  float: left;
  height: 100%;
}
#huntr-react-container-2 .ql-snow.ql-toolbar button:active:hover,
#huntr-react-container-2 .ql-snow .ql-toolbar button:active:hover {
  outline: none;
}
#huntr-react-container-2 .ql-snow.ql-toolbar input.ql-image[type=file],
#huntr-react-container-2 .ql-snow .ql-toolbar input.ql-image[type=file] {
  display: none;
}
#huntr-react-container-2 .ql-snow.ql-toolbar button:hover,
#huntr-react-container-2 .ql-snow .ql-toolbar button:hover,
#huntr-react-container-2 .ql-snow.ql-toolbar button:focus,
#huntr-react-container-2 .ql-snow .ql-toolbar button:focus,
#huntr-react-container-2 .ql-snow.ql-toolbar button.ql-active,
#huntr-react-container-2 .ql-snow .ql-toolbar button.ql-active,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label:hover,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label:hover,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label.ql-active,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label.ql-active,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item:hover,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item:hover,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item.ql-selected,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
  color: #06c;
}
#huntr-react-container-2 .ql-snow.ql-toolbar button:hover .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar button:hover .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar button:focus .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar button:focus .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar button.ql-active .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar button.ql-active .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label:hover .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item:hover .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item:hover .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar button:hover .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar button:hover .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar button:focus .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar button:focus .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar button.ql-active .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar button.ql-active .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill {
  fill: #06c;
}
#huntr-react-container-2 .ql-snow.ql-toolbar button:hover .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar button:hover .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar button:focus .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar button:focus .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar button.ql-active .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar button.ql-active .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
#huntr-react-container-2 .ql-snow.ql-toolbar button:hover .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar button:hover .ql-stroke-miter,
#huntr-react-container-2 .ql-snow.ql-toolbar button:focus .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar button:focus .ql-stroke-miter,
#huntr-react-container-2 .ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
#huntr-react-container-2 .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
#huntr-react-container-2 .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
  stroke: #06c;
}
@media (pointer: coarse) {
  .ql-snow.ql-toolbar button:hover:not(.ql-active),
  .ql-snow .ql-toolbar button:hover:not(.ql-active) {
    color: #444;
  }
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-fill,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-fill,
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-stroke.ql-fill,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-stroke.ql-fill {
    fill: #444;
  }
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-stroke,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-stroke,
  .ql-snow.ql-toolbar button:hover:not(.ql-active) .ql-stroke-miter,
  .ql-snow .ql-toolbar button:hover:not(.ql-active) .ql-stroke-miter {
    stroke: #444;
  }
}
#huntr-react-container-2 .ql-snow {
  box-sizing: border-box;
}
#huntr-react-container-2 .ql-snow * {
  box-sizing: border-box;
}
#huntr-react-container-2 .ql-snow .ql-hidden {
  display: none;
}
#huntr-react-container-2 .ql-snow .ql-out-bottom,
#huntr-react-container-2 .ql-snow .ql-out-top {
  visibility: hidden;
}
#huntr-react-container-2 .ql-snow .ql-tooltip {
  position: absolute;
  transform: translateY(10px);
}
#huntr-react-container-2 .ql-snow .ql-tooltip a {
  cursor: pointer;
  text-decoration: none;
}
#huntr-react-container-2 .ql-snow .ql-tooltip.ql-flip {
  transform: translateY(-10px);
}
#huntr-react-container-2 .ql-snow .ql-formats {
  display: inline-block;
  vertical-align: middle;
}
#huntr-react-container-2 .ql-snow .ql-formats:after {
  clear: both;
  content: '';
  display: table;
}
#huntr-react-container-2 .ql-snow .ql-stroke {
  fill: none;
  stroke: #444;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}
#huntr-react-container-2 .ql-snow .ql-stroke-miter {
  fill: none;
  stroke: #444;
  stroke-miterlimit: 10;
  stroke-width: 2;
}
#huntr-react-container-2 .ql-snow .ql-fill,
#huntr-react-container-2 .ql-snow .ql-stroke.ql-fill {
  fill: #444;
}
#huntr-react-container-2 .ql-snow .ql-empty {
  fill: none;
}
#huntr-react-container-2 .ql-snow .ql-even {
  fill-rule: evenodd;
}
#huntr-react-container-2 .ql-snow .ql-thin,
#huntr-react-container-2 .ql-snow .ql-stroke.ql-thin {
  stroke-width: 1;
}
#huntr-react-container-2 .ql-snow .ql-transparent {
  opacity: 0.4;
}
#huntr-react-container-2 .ql-snow .ql-direction svg:last-child {
  display: none;
}
#huntr-react-container-2 .ql-snow .ql-direction.ql-active svg:last-child {
  display: inline;
}
#huntr-react-container-2 .ql-snow .ql-direction.ql-active svg:first-child {
  display: none;
}
#huntr-react-container-2 .ql-snow .ql-editor h1 {
  font-size: 2em;
}
#huntr-react-container-2 .ql-snow .ql-editor h2 {
  font-size: 1.5em;
}
#huntr-react-container-2 .ql-snow .ql-editor h3 {
  font-size: 1.17em;
}
#huntr-react-container-2 .ql-snow .ql-editor h4 {
  font-size: 1em;
}
#huntr-react-container-2 .ql-snow .ql-editor h5 {
  font-size: 0.83em;
}
#huntr-react-container-2 .ql-snow .ql-editor h6 {
  font-size: 0.67em;
}
#huntr-react-container-2 .ql-snow .ql-editor a {
  text-decoration: underline;
}
#huntr-react-container-2 .ql-snow .ql-editor blockquote {
  border-left: 4px solid #ccc;
  margin-bottom: 5px;
  margin-top: 5px;
  padding-left: 16px;
}
#huntr-react-container-2 .ql-snow .ql-editor code,
#huntr-react-container-2 .ql-snow .ql-editor pre {
  background-color: #f0f0f0;
  border-radius: 3px;
}
#huntr-react-container-2 .ql-snow .ql-editor pre {
  white-space: pre-wrap;
  margin-bottom: 5px;
  margin-top: 5px;
  padding: 5px 10px;
}
#huntr-react-container-2 .ql-snow .ql-editor code {
  font-size: 85%;
  padding-bottom: 2px;
  padding-top: 2px;
}
#huntr-react-container-2 .ql-snow .ql-editor code:before,
#huntr-react-container-2 .ql-snow .ql-editor code:after {
  content: "\A0";
  letter-spacing: -2px;
}
#huntr-react-container-2 .ql-snow .ql-editor pre.ql-syntax {
  background-color: #23241f;
  color: #f8f8f2;
  overflow: visible;
}
#huntr-react-container-2 .ql-snow .ql-editor img {
  max-width: 100%;
}
#huntr-react-container-2 .ql-snow .ql-picker {
  color: #444;
  display: inline-block;
  float: left;
  font-size: 14px;
  font-weight: 500;
  height: 24px;
  position: relative;
  vertical-align: middle;
}
#huntr-react-container-2 .ql-snow .ql-picker-label {
  cursor: pointer;
  display: inline-block;
  height: 100%;
  padding-left: 8px;
  padding-right: 2px;
  position: relative;
  width: 100%;
}
#huntr-react-container-2 .ql-snow .ql-picker-label::before {
  display: inline-block;
  line-height: 22px;
}
#huntr-react-container-2 .ql-snow .ql-picker-options {
  background-color: #fff;
  display: none;
  min-width: 100%;
  padding: 4px 8px;
  position: absolute;
  white-space: nowrap;
}
#huntr-react-container-2 .ql-snow .ql-picker-options .ql-picker-item {
  cursor: pointer;
  display: block;
  padding-bottom: 5px;
  padding-top: 5px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-expanded .ql-picker-label {
  color: #ccc;
  z-index: 2;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-fill {
  fill: #ccc;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-expanded .ql-picker-label .ql-stroke {
  stroke: #ccc;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-expanded .ql-picker-options {
  display: block;
  margin-top: -1px;
  top: 100%;
  z-index: 1;
}
#huntr-react-container-2 .ql-snow .ql-color-picker,
#huntr-react-container-2 .ql-snow .ql-icon-picker {
  width: 28px;
}
#huntr-react-container-2 .ql-snow .ql-color-picker .ql-picker-label,
#huntr-react-container-2 .ql-snow .ql-icon-picker .ql-picker-label {
  padding: 2px 4px;
}
#huntr-react-container-2 .ql-snow .ql-color-picker .ql-picker-label svg,
#huntr-react-container-2 .ql-snow .ql-icon-picker .ql-picker-label svg {
  right: 4px;
}
#huntr-react-container-2 .ql-snow .ql-icon-picker .ql-picker-options {
  padding: 4px 0px;
}
#huntr-react-container-2 .ql-snow .ql-icon-picker .ql-picker-item {
  height: 24px;
  width: 24px;
  padding: 2px 4px;
}
#huntr-react-container-2 .ql-snow .ql-color-picker .ql-picker-options {
  padding: 3px 5px;
  width: 152px;
}
#huntr-react-container-2 .ql-snow .ql-color-picker .ql-picker-item {
  border: 1px solid transparent;
  float: left;
  height: 16px;
  margin: 2px;
  padding: 0px;
  width: 16px;
}
#huntr-react-container-2 .ql-snow .ql-picker:not(.ql-color-picker):not(.ql-icon-picker) svg {
  position: absolute;
  margin-top: -9px;
  right: 0;
  top: 50%;
  width: 18px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-label]:not([data-label=''])::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-label[data-label]:not([data-label=''])::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-label[data-label]:not([data-label=''])::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-label]:not([data-label=''])::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-item[data-label]:not([data-label=''])::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-label]:not([data-label=''])::before {
  content: attr(data-label);
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header {
  width: 98px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item::before {
  content: 'Normal';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
  content: 'Heading 1';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
  content: 'Heading 2';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
  content: 'Heading 3';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
  content: 'Heading 4';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before {
  content: 'Heading 5';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before {
  content: 'Heading 6';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
  font-size: 2em;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
  font-size: 1.5em;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
  font-size: 1.17em;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before {
  font-size: 1em;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before {
  font-size: 0.83em;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before {
  font-size: 0.67em;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-font {
  width: 108px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-label::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-item::before {
  content: 'Sans Serif';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-label[data-value=serif]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-item[data-value=serif]::before {
  content: 'Serif';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-label[data-value=monospace]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-item[data-value=monospace]::before {
  content: 'Monospace';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-item[data-value=serif]::before {
  font-family: Georgia, Times New Roman, serif;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-font .ql-picker-item[data-value=monospace]::before {
  font-family: Monaco, Courier New, monospace;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size {
  width: 98px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-label::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item::before {
  content: 'Normal';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-label[data-value=small]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-value=small]::before {
  content: 'Small';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-label[data-value=large]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-value=large]::before {
  content: 'Large';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-label[data-value=huge]::before,
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-value=huge]::before {
  content: 'Huge';
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-value=small]::before {
  font-size: 10px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-value=large]::before {
  font-size: 18px;
}
#huntr-react-container-2 .ql-snow .ql-picker.ql-size .ql-picker-item[data-value=huge]::before {
  font-size: 32px;
}
#huntr-react-container-2 .ql-snow .ql-color-picker.ql-background .ql-picker-item {
  background-color: #fff;
}
#huntr-react-container-2 .ql-snow .ql-color-picker.ql-color .ql-picker-item {
  background-color: #000;
}
#huntr-react-container-2 .ql-toolbar.ql-snow {
  border-bottom: 1px solid #ECE9F2;
  box-sizing: border-box;
  font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
  padding: 8px;
}
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-formats {
  margin-right: 15px;
}
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-picker-label {
  border: 1px solid transparent;
}
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-picker-options {
  border: 1px solid transparent;
  box-shadow: rgba(0,0,0,0.2) 0 2px 8px;
}
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label {
  border-color: #ccc;
}
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
  border-color: #ccc;
}
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-color-picker .ql-picker-item.ql-selected,
#huntr-react-container-2 .ql-toolbar.ql-snow .ql-color-picker .ql-picker-item:hover {
  border-color: #000;
}
#huntr-react-container-2 .ql-toolbar.ql-snow + .ql-container.ql-snow {
  border-top: 0px;
  padding-bottom: 40px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip {
  background-color: #fff;
  border: 1px solid #ccc;
  box-shadow: 0px 0px 5px #ddd;
  color: #444;
  padding: 5px 12px;
  white-space: nowrap;
}
#huntr-react-container-2 .ql-snow .ql-tooltip::before {
  content: "Visit URL:";
  line-height: 26px;
  margin-right: 8px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip input[type=text] {
  display: none;
  border: 1px solid #ccc;
  font-size: 13px;
  height: 26px;
  margin: 0px;
  padding: 3px 5px;
  width: 170px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip a.ql-preview {
  display: inline-block;
  max-width: 200px;
  overflow-x: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}
#huntr-react-container-2 .ql-snow .ql-tooltip a.ql-action::after {
  border-right: 1px solid #ccc;
  content: 'Edit';
  margin-left: 16px;
  padding-right: 8px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip a.ql-remove::before {
  content: 'Remove';
  margin-left: 8px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip a {
  line-height: 26px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip.ql-editing a.ql-preview,
#huntr-react-container-2 .ql-snow .ql-tooltip.ql-editing a.ql-remove {
  display: none;
}
#huntr-react-container-2 .ql-snow .ql-tooltip.ql-editing input[type=text] {
  display: inline-block;
}
#huntr-react-container-2 .ql-snow .ql-tooltip.ql-editing a.ql-action::after {
  border-right: 0px;
  content: 'Save';
  padding-right: 0px;
}
#huntr-react-container-2 .ql-snow .ql-tooltip[data-mode=link]::before {
  content: "Enter link:";
}
#huntr-react-container-2 .ql-snow .ql-tooltip[data-mode=formula]::before {
  content: "Enter formula:";
}
#huntr-react-container-2 .ql-snow .ql-tooltip[data-mode=video]::before {
  content: "Enter video:";
}
#huntr-react-container-2 .ql-snow a {
  color: #06c;
}
</style><style type="text/css">.react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle, .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle, .react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-year-read-view--down-arrow {
  margin-left: -8px;
  position: absolute;
}

.react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle, .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle, .react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-year-read-view--down-arrow, .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::before, .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle::before, .react-datepicker__year-read-view--down-arrow::before,
.react-datepicker__month-read-view--down-arrow::before,
.react-datepicker__month-year-read-view--down-arrow::before {
  box-sizing: content-box;
  position: absolute;
  border: 8px solid transparent;
  height: 0;
  width: 1px;
}

.react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::before, .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle::before, .react-datepicker__year-read-view--down-arrow::before,
.react-datepicker__month-read-view--down-arrow::before,
.react-datepicker__month-year-read-view--down-arrow::before {
  content: "";
  z-index: -1;
  border-width: 8px;
  left: -8px;
  border-bottom-color: #aeaeae;
}

.react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle {
  top: 0;
  margin-top: -8px;
}

.react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle, .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::before {
  border-top: none;
  border-bottom-color: #f0f0f0;
}

.react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::before {
  top: -1px;
  border-bottom-color: #aeaeae;
}

.react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle, .react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-year-read-view--down-arrow {
  bottom: 0;
  margin-bottom: -8px;
}

.react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle, .react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-year-read-view--down-arrow, .react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle::before, .react-datepicker__year-read-view--down-arrow::before,
.react-datepicker__month-read-view--down-arrow::before,
.react-datepicker__month-year-read-view--down-arrow::before {
  border-bottom: none;
  border-top-color: #fff;
}

.react-datepicker-popper[data-placement^="top"] .react-datepicker__triangle::before, .react-datepicker__year-read-view--down-arrow::before,
.react-datepicker__month-read-view--down-arrow::before,
.react-datepicker__month-year-read-view--down-arrow::before {
  bottom: -1px;
  border-top-color: #aeaeae;
}

.react-datepicker-wrapper {
  display: inline-block;
  padding: 0;
  border: 0;
}

.react-datepicker {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 0.8rem;
  background-color: #fff;
  color: #000;
  border: 1px solid #aeaeae;
  border-radius: 0.3rem;
  display: inline-block;
  position: relative;
}

.react-datepicker--time-only .react-datepicker__triangle {
  left: 35px;
}

.react-datepicker--time-only .react-datepicker__time-container {
  border-left: 0;
}

.react-datepicker--time-only .react-datepicker__time,
.react-datepicker--time-only .react-datepicker__time-box {
  border-bottom-left-radius: 0.3rem;
  border-bottom-right-radius: 0.3rem;
}

.react-datepicker__triangle {
  position: absolute;
  left: 50px;
}

.react-datepicker-popper {
  z-index: 1;
}

.react-datepicker-popper[data-placement^="bottom"] {
  margin-top: 10px;
}

.react-datepicker-popper[data-placement="bottom-end"] .react-datepicker__triangle, .react-datepicker-popper[data-placement="top-end"] .react-datepicker__triangle {
  left: auto;
  right: 50px;
}

.react-datepicker-popper[data-placement^="top"] {
  margin-bottom: 10px;
}

.react-datepicker-popper[data-placement^="right"] {
  margin-left: 8px;
}

.react-datepicker-popper[data-placement^="right"] .react-datepicker__triangle {
  left: auto;
  right: 42px;
}

.react-datepicker-popper[data-placement^="left"] {
  margin-right: 8px;
}

.react-datepicker-popper[data-placement^="left"] .react-datepicker__triangle {
  left: 42px;
  right: auto;
}

.react-datepicker__header {
  text-align: center;
  background-color: #f0f0f0;
  border-bottom: 1px solid #aeaeae;
  border-top-left-radius: 0.3rem;
  padding-top: 8px;
  position: relative;
}

.react-datepicker__header--time {
  padding-bottom: 8px;
  padding-left: 5px;
  padding-right: 5px;
}

.react-datepicker__header--time:not(.react-datepicker__header--time--only) {
  border-top-left-radius: 0;
}

.react-datepicker__header:not(.react-datepicker__header--has-time-select) {
  border-top-right-radius: 0.3rem;
}

.react-datepicker__year-dropdown-container--select,
.react-datepicker__month-dropdown-container--select,
.react-datepicker__month-year-dropdown-container--select,
.react-datepicker__year-dropdown-container--scroll,
.react-datepicker__month-dropdown-container--scroll,
.react-datepicker__month-year-dropdown-container--scroll {
  display: inline-block;
  margin: 0 2px;
}

.react-datepicker__current-month,
.react-datepicker-time__header,
.react-datepicker-year-header {
  margin-top: 0;
  color: #000;
  font-weight: bold;
  font-size: 0.944rem;
}

.react-datepicker-time__header {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.react-datepicker__navigation {
  background: none;
  line-height: 1.7rem;
  text-align: center;
  cursor: pointer;
  position: absolute;
  top: 10px;
  width: 0;
  padding: 0;
  border: 0.45rem solid transparent;
  z-index: 1;
  height: 10px;
  width: 10px;
  text-indent: -999em;
  overflow: hidden;
}

.react-datepicker__navigation--previous {
  left: 10px;
  border-right-color: #ccc;
}

.react-datepicker__navigation--previous:hover {
  border-right-color: #b3b3b3;
}

.react-datepicker__navigation--previous--disabled, .react-datepicker__navigation--previous--disabled:hover {
  border-right-color: #e6e6e6;
  cursor: default;
}

.react-datepicker__navigation--next {
  right: 10px;
  border-left-color: #ccc;
}

.react-datepicker__navigation--next--with-time:not(.react-datepicker__navigation--next--with-today-button) {
  right: 95px;
}

.react-datepicker__navigation--next:hover {
  border-left-color: #b3b3b3;
}

.react-datepicker__navigation--next--disabled, .react-datepicker__navigation--next--disabled:hover {
  border-left-color: #e6e6e6;
  cursor: default;
}

.react-datepicker__navigation--years {
  position: relative;
  top: 0;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.react-datepicker__navigation--years-previous {
  top: 4px;
  border-top-color: #ccc;
}

.react-datepicker__navigation--years-previous:hover {
  border-top-color: #b3b3b3;
}

.react-datepicker__navigation--years-upcoming {
  top: -4px;
  border-bottom-color: #ccc;
}

.react-datepicker__navigation--years-upcoming:hover {
  border-bottom-color: #b3b3b3;
}

.react-datepicker__month-container {
  float: left;
}

.react-datepicker__year {
  margin: 0.4rem;
  text-align: center;
}

.react-datepicker__year-wrapper {
  display: flex;
  flex-wrap: wrap;
  max-width: 180px;
}

.react-datepicker__year .react-datepicker__year-text {
  display: inline-block;
  width: 4rem;
  margin: 2px;
}

.react-datepicker__month {
  margin: 0.4rem;
  text-align: center;
}

.react-datepicker__month .react-datepicker__month-text,
.react-datepicker__month .react-datepicker__quarter-text {
  display: inline-block;
  width: 4rem;
  margin: 2px;
}

.react-datepicker__input-time-container {
  clear: both;
  width: 100%;
  float: left;
  margin: 5px 0 10px 15px;
  text-align: left;
}

.react-datepicker__input-time-container .react-datepicker-time__caption {
  display: inline-block;
}

.react-datepicker__input-time-container .react-datepicker-time__input-container {
  display: inline-block;
}

.react-datepicker__input-time-container .react-datepicker-time__input-container .react-datepicker-time__input {
  display: inline-block;
  margin-left: 10px;
}

.react-datepicker__input-time-container .react-datepicker-time__input-container .react-datepicker-time__input input {
  width: auto;
}

.react-datepicker__input-time-container .react-datepicker-time__input-container .react-datepicker-time__input input[type="time"]::-webkit-inner-spin-button,
.react-datepicker__input-time-container .react-datepicker-time__input-container .react-datepicker-time__input input[type="time"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.react-datepicker__input-time-container .react-datepicker-time__input-container .react-datepicker-time__input input[type="time"] {
  -moz-appearance: textfield;
}

.react-datepicker__input-time-container .react-datepicker-time__input-container .react-datepicker-time__delimiter {
  margin-left: 5px;
  display: inline-block;
}

.react-datepicker__time-container {
  float: right;
  border-left: 1px solid #aeaeae;
  width: 85px;
}

.react-datepicker__time-container--with-today-button {
  display: inline;
  border: 1px solid #aeaeae;
  border-radius: 0.3rem;
  position: absolute;
  right: -72px;
  top: 0;
}

.react-datepicker__time-container .react-datepicker__time {
  position: relative;
  background: white;
  border-bottom-right-radius: 0.3rem;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box {
  width: 85px;
  overflow-x: hidden;
  margin: 0 auto;
  text-align: center;
  border-bottom-right-radius: 0.3rem;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list {
  list-style: none;
  margin: 0;
  height: calc(195px + (1.7rem / 2));
  overflow-y: scroll;
  padding-right: 0px;
  padding-left: 0px;
  width: 100%;
  box-sizing: content-box;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item {
  height: 30px;
  padding: 5px 10px;
  white-space: nowrap;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover {
  cursor: pointer;
  background-color: #f0f0f0;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
  background-color: #216ba5;
  color: white;
  font-weight: bold;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected:hover {
  background-color: #216ba5;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--disabled {
  color: #ccc;
}

.react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--disabled:hover {
  cursor: default;
  background-color: transparent;
}

.react-datepicker__week-number {
  color: #ccc;
  display: inline-block;
  width: 1.7rem;
  line-height: 1.7rem;
  text-align: center;
  margin: 0.166rem;
}

.react-datepicker__week-number.react-datepicker__week-number--clickable {
  cursor: pointer;
}

.react-datepicker__week-number.react-datepicker__week-number--clickable:hover {
  border-radius: 0.3rem;
  background-color: #f0f0f0;
}

.react-datepicker__day-names,
.react-datepicker__week {
  white-space: nowrap;
}

.react-datepicker__day-name,
.react-datepicker__day,
.react-datepicker__time-name {
  color: #000;
  display: inline-block;
  width: 1.7rem;
  line-height: 1.7rem;
  text-align: center;
  margin: 0.166rem;
}

.react-datepicker__month--selected, .react-datepicker__month--in-selecting-range, .react-datepicker__month--in-range,
.react-datepicker__quarter--selected,
.react-datepicker__quarter--in-selecting-range,
.react-datepicker__quarter--in-range {
  border-radius: 0.3rem;
  background-color: #216ba5;
  color: #fff;
}

.react-datepicker__month--selected:hover, .react-datepicker__month--in-selecting-range:hover, .react-datepicker__month--in-range:hover,
.react-datepicker__quarter--selected:hover,
.react-datepicker__quarter--in-selecting-range:hover,
.react-datepicker__quarter--in-range:hover {
  background-color: #1d5d90;
}

.react-datepicker__month--disabled,
.react-datepicker__quarter--disabled {
  color: #ccc;
  pointer-events: none;
}

.react-datepicker__month--disabled:hover,
.react-datepicker__quarter--disabled:hover {
  cursor: default;
  background-color: transparent;
}

.react-datepicker__day,
.react-datepicker__month-text,
.react-datepicker__quarter-text,
.react-datepicker__year-text {
  cursor: pointer;
}

.react-datepicker__day:hover,
.react-datepicker__month-text:hover,
.react-datepicker__quarter-text:hover,
.react-datepicker__year-text:hover {
  border-radius: 0.3rem;
  background-color: #f0f0f0;
}

.react-datepicker__day--today,
.react-datepicker__month-text--today,
.react-datepicker__quarter-text--today,
.react-datepicker__year-text--today {
  font-weight: bold;
}

.react-datepicker__day--highlighted,
.react-datepicker__month-text--highlighted,
.react-datepicker__quarter-text--highlighted,
.react-datepicker__year-text--highlighted {
  border-radius: 0.3rem;
  background-color: #3dcc4a;
  color: #fff;
}

.react-datepicker__day--highlighted:hover,
.react-datepicker__month-text--highlighted:hover,
.react-datepicker__quarter-text--highlighted:hover,
.react-datepicker__year-text--highlighted:hover {
  background-color: #32be3f;
}

.react-datepicker__day--highlighted-custom-1,
.react-datepicker__month-text--highlighted-custom-1,
.react-datepicker__quarter-text--highlighted-custom-1,
.react-datepicker__year-text--highlighted-custom-1 {
  color: magenta;
}

.react-datepicker__day--highlighted-custom-2,
.react-datepicker__month-text--highlighted-custom-2,
.react-datepicker__quarter-text--highlighted-custom-2,
.react-datepicker__year-text--highlighted-custom-2 {
  color: green;
}

.react-datepicker__day--selected, .react-datepicker__day--in-selecting-range, .react-datepicker__day--in-range,
.react-datepicker__month-text--selected,
.react-datepicker__month-text--in-selecting-range,
.react-datepicker__month-text--in-range,
.react-datepicker__quarter-text--selected,
.react-datepicker__quarter-text--in-selecting-range,
.react-datepicker__quarter-text--in-range,
.react-datepicker__year-text--selected,
.react-datepicker__year-text--in-selecting-range,
.react-datepicker__year-text--in-range {
  border-radius: 0.3rem;
  background-color: #216ba5;
  color: #fff;
}

.react-datepicker__day--selected:hover, .react-datepicker__day--in-selecting-range:hover, .react-datepicker__day--in-range:hover,
.react-datepicker__month-text--selected:hover,
.react-datepicker__month-text--in-selecting-range:hover,
.react-datepicker__month-text--in-range:hover,
.react-datepicker__quarter-text--selected:hover,
.react-datepicker__quarter-text--in-selecting-range:hover,
.react-datepicker__quarter-text--in-range:hover,
.react-datepicker__year-text--selected:hover,
.react-datepicker__year-text--in-selecting-range:hover,
.react-datepicker__year-text--in-range:hover {
  background-color: #1d5d90;
}

.react-datepicker__day--keyboard-selected,
.react-datepicker__month-text--keyboard-selected,
.react-datepicker__quarter-text--keyboard-selected,
.react-datepicker__year-text--keyboard-selected {
  border-radius: 0.3rem;
  background-color: #2a87d0;
  color: #fff;
}

.react-datepicker__day--keyboard-selected:hover,
.react-datepicker__month-text--keyboard-selected:hover,
.react-datepicker__quarter-text--keyboard-selected:hover,
.react-datepicker__year-text--keyboard-selected:hover {
  background-color: #1d5d90;
}

.react-datepicker__day--in-selecting-range ,
.react-datepicker__month-text--in-selecting-range ,
.react-datepicker__quarter-text--in-selecting-range ,
.react-datepicker__year-text--in-selecting-range {
  background-color: rgba(33, 107, 165, 0.5);
}

.react-datepicker__month--selecting-range .react-datepicker__day--in-range , .react-datepicker__month--selecting-range
.react-datepicker__month-text--in-range , .react-datepicker__month--selecting-range
.react-datepicker__quarter-text--in-range , .react-datepicker__month--selecting-range
.react-datepicker__year-text--in-range {
  background-color: #f0f0f0;
  color: #000;
}

.react-datepicker__day--disabled,
.react-datepicker__month-text--disabled,
.react-datepicker__quarter-text--disabled,
.react-datepicker__year-text--disabled {
  cursor: default;
  color: #ccc;
}

.react-datepicker__day--disabled:hover,
.react-datepicker__month-text--disabled:hover,
.react-datepicker__quarter-text--disabled:hover,
.react-datepicker__year-text--disabled:hover {
  background-color: transparent;
}

.react-datepicker__month-text.react-datepicker__month--selected:hover, .react-datepicker__month-text.react-datepicker__month--in-range:hover, .react-datepicker__month-text.react-datepicker__quarter--selected:hover, .react-datepicker__month-text.react-datepicker__quarter--in-range:hover,
.react-datepicker__quarter-text.react-datepicker__month--selected:hover,
.react-datepicker__quarter-text.react-datepicker__month--in-range:hover,
.react-datepicker__quarter-text.react-datepicker__quarter--selected:hover,
.react-datepicker__quarter-text.react-datepicker__quarter--in-range:hover {
  background-color: #216ba5;
}

.react-datepicker__month-text:hover,
.react-datepicker__quarter-text:hover {
  background-color: #f0f0f0;
}

.react-datepicker__input-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.react-datepicker__year-read-view,
.react-datepicker__month-read-view,
.react-datepicker__month-year-read-view {
  border: 1px solid transparent;
  border-radius: 0.3rem;
}

.react-datepicker__year-read-view:hover,
.react-datepicker__month-read-view:hover,
.react-datepicker__month-year-read-view:hover {
  cursor: pointer;
}

.react-datepicker__year-read-view:hover .react-datepicker__year-read-view--down-arrow,
.react-datepicker__year-read-view:hover .react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-read-view:hover .react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-read-view:hover .react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-year-read-view:hover .react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-year-read-view:hover .react-datepicker__month-read-view--down-arrow {
  border-top-color: #b3b3b3;
}

.react-datepicker__year-read-view--down-arrow,
.react-datepicker__month-read-view--down-arrow,
.react-datepicker__month-year-read-view--down-arrow {
  border-top-color: #ccc;
  float: right;
  margin-left: 20px;
  top: 8px;
  position: relative;
  border-width: 0.45rem;
}

.react-datepicker__year-dropdown,
.react-datepicker__month-dropdown,
.react-datepicker__month-year-dropdown {
  background-color: #f0f0f0;
  position: absolute;
  width: 50%;
  left: 25%;
  top: 30px;
  z-index: 1;
  text-align: center;
  border-radius: 0.3rem;
  border: 1px solid #aeaeae;
}

.react-datepicker__year-dropdown:hover,
.react-datepicker__month-dropdown:hover,
.react-datepicker__month-year-dropdown:hover {
  cursor: pointer;
}

.react-datepicker__year-dropdown--scrollable,
.react-datepicker__month-dropdown--scrollable,
.react-datepicker__month-year-dropdown--scrollable {
  height: 150px;
  overflow-y: scroll;
}

.react-datepicker__year-option,
.react-datepicker__month-option,
.react-datepicker__month-year-option {
  line-height: 20px;
  width: 100%;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.react-datepicker__year-option:first-of-type,
.react-datepicker__month-option:first-of-type,
.react-datepicker__month-year-option:first-of-type {
  border-top-left-radius: 0.3rem;
  border-top-right-radius: 0.3rem;
}

.react-datepicker__year-option:last-of-type,
.react-datepicker__month-option:last-of-type,
.react-datepicker__month-year-option:last-of-type {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-bottom-left-radius: 0.3rem;
  border-bottom-right-radius: 0.3rem;
}

.react-datepicker__year-option:hover,
.react-datepicker__month-option:hover,
.react-datepicker__month-year-option:hover {
  background-color: #ccc;
}

.react-datepicker__year-option:hover .react-datepicker__navigation--years-upcoming,
.react-datepicker__month-option:hover .react-datepicker__navigation--years-upcoming,
.react-datepicker__month-year-option:hover .react-datepicker__navigation--years-upcoming {
  border-bottom-color: #b3b3b3;
}

.react-datepicker__year-option:hover .react-datepicker__navigation--years-previous,
.react-datepicker__month-option:hover .react-datepicker__navigation--years-previous,
.react-datepicker__month-year-option:hover .react-datepicker__navigation--years-previous {
  border-top-color: #b3b3b3;
}

.react-datepicker__year-option--selected,
.react-datepicker__month-option--selected,
.react-datepicker__month-year-option--selected {
  position: absolute;
  left: 15px;
}

.react-datepicker__close-icon {
  cursor: pointer;
  background-color: transparent;
  border: 0;
  outline: 0;
  padding: 0px 6px 0px 0px;
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: table-cell;
  vertical-align: middle;
}

.react-datepicker__close-icon::after {
  cursor: pointer;
  background-color: #216ba5;
  color: #fff;
  border-radius: 50%;
  height: 16px;
  width: 16px;
  padding: 2px;
  font-size: 12px;
  line-height: 1;
  text-align: center;
  display: table-cell;
  vertical-align: middle;
  content: "\D7";
}

.react-datepicker__today-button {
  background: #f0f0f0;
  border-top: 1px solid #aeaeae;
  cursor: pointer;
  text-align: center;
  font-weight: bold;
  padding: 5px 0;
  clear: left;
}

.react-datepicker__portal {
  position: fixed;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  left: 0;
  top: 0;
  justify-content: center;
  align-items: center;
  display: flex;
  z-index: 2147483647;
}

.react-datepicker__portal .react-datepicker__day-name,
.react-datepicker__portal .react-datepicker__day,
.react-datepicker__portal .react-datepicker__time-name {
  width: 3rem;
  line-height: 3rem;
}

@media (max-width: 400px), (max-height: 550px) {
  .react-datepicker__portal .react-datepicker__day-name,
  .react-datepicker__portal .react-datepicker__day,
  .react-datepicker__portal .react-datepicker__time-name {
    width: 2rem;
    line-height: 2rem;
  }
}

.react-datepicker__portal .react-datepicker__current-month,
.react-datepicker__portal .react-datepicker-time__header {
  font-size: 1.44rem;
}

.react-datepicker__portal .react-datepicker__navigation {
  border: 0.81rem solid transparent;
}

.react-datepicker__portal .react-datepicker__navigation--previous {
  border-right-color: #ccc;
}

.react-datepicker__portal .react-datepicker__navigation--previous:hover {
  border-right-color: #b3b3b3;
}

.react-datepicker__portal .react-datepicker__navigation--previous--disabled, .react-datepicker__portal .react-datepicker__navigation--previous--disabled:hover {
  border-right-color: #e6e6e6;
  cursor: default;
}

.react-datepicker__portal .react-datepicker__navigation--next {
  border-left-color: #ccc;
}

.react-datepicker__portal .react-datepicker__navigation--next:hover {
  border-left-color: #b3b3b3;
}

.react-datepicker__portal .react-datepicker__navigation--next--disabled, .react-datepicker__portal .react-datepicker__navigation--next--disabled:hover {
  border-left-color: #e6e6e6;
  cursor: default;
}
</style><style id="mttstyle">
    #mttContainer {
      left: 0 !important;
      top: 0 !important;
      position: fixed !important;
      z-index: 100000200 !important;
      width: 500px !important;
      margin-left: -250px !important;
      background-color: #00000000  !important;
      pointer-events: none !important;
    }
    .bootstrapiso .tooltip {
      width:auto  !important;
      height:auto  !important;
      background:transparent  !important;
      border:none !important;
      border-radius: 0px !important;
      visibility: visible  !important;
      pointer-events: none !important;
    }
    .bootstrapiso .tooltip-inner {
      font-size: 14px  !important;
      max-width: 200px  !important;
      text-align: center !important;
      backdrop-filter: blur(2px)  !important; 
      background-color: #000000b8 !important;
      color: #ffffffff !important;
      border-radius: .25rem !important;
      pointer-events: none !important;
    }
    .bootstrapiso .arrow::before {
      border-top-color: #000000b8 !important;
    }
    @media print {
      @page {
        size: auto;
        padding: 0 !important;
        margin: 0 !important;
      }
    
      @page :footer {
        display: none;
        padding: 0 !important;
        margin: 0 !important;
      }
    
      @page :header {
        display: none;
        padding: 0 !important;
        margin: 0 !important;
      }
    
      html, body {
        padding: 0 !important;
        margin: 0 !important;
      }
    
      .sticker-page-wrapper1,
      .sticker-page-wrapper2,
      .sticker-page-wrapper3 {
        page-break-before: always;
        font-size: 14px !important;
        height: 100%;
        padding-top: 1.7em !important;
      }
    
      .sticker-page-wrapper1 .bar-code,
      .sticker-page-wrapper2 .bar_code_wrap,
      .sticker-page-wrapper3 .bar-code {
        padding-top: 0 !important;
      }
    
      .sticker-page-wrapper3 .middle-content {
        font-size: 1.25em !important;
      }
    
      .sticker_wrapper {
        box-sizing: border-box;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
    }
    
    .bottom_date {
      float: left !important;
    }
    
    .sticker-page-wrapper1 {
      box-sizing: border-box;
      -webkit-text-size-adjust: 100%;
    }
    
    .sticker-page-wrapper1 *, .sticker-page-wrapper1 *:before, .sticker-page-wrapper1 *:after {
      box-sizing: inherit;
    }
    
    .sticker-page-wrapper1 {
      direction: rtl;
      color: #000;
      background: #fff;
      font: 2.941176471vw/1.5 'Heebo', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      margin: 0;
    }
    
    @media (min-width: 544px) {
      .sticker-page-wrapper1 {
        font-size: 16px;
      }
    }
    
    .sticker-page-wrapper1 .sticker_wrapper {
      max-width: 35.3125em;
      margin: 0 auto;
      padding: 0 1em 5.625em;
      position: relative;
      min-height: 100%;
    }
    
    .sticker-page-wrapper1 img {
      vertical-align: top;
      max-width: 100%;
      height: auto;
    }
    
    .sticker-page-wrapper1 .sticker_date {
      font-weight: 500;
      text-align: center;
      padding: 0.1875em;
    }
    
    .sticker-page-wrapper1 .bar-code {
      margin: 0 auto;
      width: 14.4375em;
      padding: 1em 0;
    }
    
    .sticker-page-wrapper1 .bar-code img {
      width: 100%;
    }
    
    .sticker-page-wrapper1 table {
      width: 100%;
      border: 1px solid #000;
      border-collapse: collapse;
    }
    
    .sticker-page-wrapper1 table th,
    .sticker-page-wrapper1 table td {
      border: 1px solid #000;
      padding: 0.5em 1.25em 0.4375em;
    }
    
    .sticker-page-wrapper1 table tbody th {
      width: 55.2%;
      text-align: right;
      font-weight: 500;
    }
    
    .sticker-page-wrapper1 table tbody td {
      padding-right: 2.125em;
    }
    
    .sticker-page-wrapper1 tfoot td {
      background: #eaebeb;
      text-align: center;
    }
    
    .sticker-page-wrapper1 .bottom-logo {
      margin: 0 auto;
      width: 14.4375em;
      bottom: 1.8125em;
      position: absolute;
      left: 0;
      right: 0;
    }
    
    .sticker-page-wrapper1 .bottom-logo img {
      width: 100%;
    }
    .sticker-page-wrapper2 {
      box-sizing: border-box;
      -webkit-text-size-adjust: 100%;
    }
    
    .sticker-page-wrapper2 *, .sticker-page-wrapper2 *:before, .sticker-page-wrapper2 *:after {
      box-sizing: inherit;
    }
    
    .sticker-page-wrapper2 {
      direction: rtl;
      color: #000;
      background: #fff;
      font: 2.941176471vw/1.5 'Heebo', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      margin: 0;
    }
    
    @media (min-width: 544px) {
      .sticker-page-wrapper2 {
        font-size: 16px;
      }
    }
    
    .sticker-page-wrapper2 .sticker_wrapper {
      max-width: 35.3125em;
      margin: 0 auto;
      padding: 0 1em 5.625em;
      position: relative;
      min-height: 100%;
    }
    
    .sticker-page-wrapper2 img {
      vertical-align: top;
      max-width: 100%;
      height: auto;
    }
    
    .sticker-page-wrapper2 .sticker_date {
      font-weight: 500;
      text-align: center;
      padding: 0.5em;
    }
    
    .sticker-page-wrapper2 .bar_code_wrap {
      display: flex;
      padding: 0.5em 0 1em;
    }
    
    .sticker-page-wrapper2 .order_detail_info {
      padding: 0.1875em 0.875em;
    }
    
    .bar-code {
      margin: 0 auto 0 0;
      width: 14.125em;
    }
    
    .sticker-page-wrapper2 .bar-code img {
      width: 100%;
    }
    
    .sticker-page-wrapper2 table {
      width: 100%;
      border: 2px solid #000;
      border-collapse: collapse;
      font-size: 0.875em;
      margin: 0 0 1.3571em;
    }
    
    .sticker-page-wrapper2 table th,
    .sticker-page-wrapper2 table td {
      border: 1px solid #000;
    }
    
    .sticker-page-wrapper2 table .sku {
      width: 7.75em;
    }
    
    .sticker-page-wrapper2 table .amount {
      width: 4.1667em;
    }
    
    .sticker-page-wrapper2 table .item_name {
      width: 20em;
    }
    
    .sticker-page-wrapper2 table .return {
      width: 4.5em;
    }
    
    .sticker-page-wrapper2 .text-center {
      text-align: center !important;
    }
    
    .sticker-page-wrapper2 table .reason_code {
      width: 7.25em;
    }
    
    .sticker-page-wrapper2 table thead td,
    .sticker-page-wrapper2 table thead th {
      text-align: right;
      font-size: 0.75em;
      font-weight: 500;
      padding: 0.6667em;
    }
    
    .sticker-page-wrapper2 table tbody td {
      padding: 0.5714em 0.52em 0.53em;
    }
    
    .sticker-page-wrapper2 .form_title {
      display: block;
      margin: 0 0 0.4375em;
    }
    
    .sticker-page-wrapper2 .checkbox_wrap {
      display: inline-block;
      vertical-align: top;
      text-align: right;
      position: relative;
      margin: 0 1.0625em;
    }
    
    .sticker-page-wrapper2 .checkbox_wrap label {
      display: inline-block;
      vertical-align: top;
      padding-right: 1.9375em;
    }
    
    .sticker-page-wrapper2 .checkbox_wrap label input[type="checkbox"] {
      position: absolute;
      top: 0;
      right: 0;
      opacity: 0;
    }
    
    .sticker-page-wrapper2 .checkbox_wrap label input[type="checkbox"]:checked ~ .fake-input:before {
      opacity: 1;
    }
    
    .sticker-page-wrapper2 .checkbox_wrap .fake-input {
      position: absolute;
      top: 0;
      right: 0;
      width: 1.4375em;
      height: 1.4375em;
      border: 2px solid #000;
    }
    
    .sticker-page-wrapper2 .checkbox_wrap .fake-input:before {
      content: '';
      position: absolute;
      border: 2px solid #000;
      border-width: 0 2px 2px 0;
      width: 0.4375em;
      height: 0.875em;
      top: 45%;
      right: 50%;
      opacity: 0;
      transition: 0.25s ease opacity;
      -webkit-transform: translate(50%, -50%) rotate(45deg);
      -moz-transform: translate(50%, -50%) rotate(45deg);
      -ms-transform: translate(50%, -50%) rotate(45deg);
      -o-transform: translate(50%, -50%) rotate(45deg);
      transform: translate(50%, -50%) rotate(45deg);
    }
    
    .sticker-page-wrapper2 .bottom-info {
      font-size: 0.75em;
      padding: 0.25em 0 0.6667em;
    }
    
    .sticker-page-wrapper2 textarea.notes_input {
      display: block;
      width: 100%;
      resize: none;
      border: 1px solid #000;
      color: #000;
      background: #eaebeb;
      font: 500 1em/1 'Heebo', sans-serif;
      height: 2.625em;
      padding: 0.6875em 0.875em;
    }
    
    .sticker-page-wrapper2 .bottom-logo {
      margin: 0 auto;
      width: 14.4375em;
      bottom: 1.8125em;
      position: absolute;
      left: 0;
      right: 0;
    }
    
    .sticker-page-wrapper2 .bottom-logo img {
      width: 100%;
    }
    .sticker-page-wrapper3 {
      box-sizing: border-box;
      -webkit-text-size-adjust: 100%;
    }
    
    .sticker-page-wrapper3 *, .sticker-page-wrapper3 *:before, .sticker-page-wrapper3 *:after {
      box-sizing: inherit;
    }
    
    .sticker-page-wrapper3 {
      direction: rtl;
      color: #000;
      background: #fff;
      font: 2.941176471vw/1.5 'Heebo', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      margin: 0;
    }
    
    @media (min-width: 544px) {
      .sticker-page-wrapper3 {
        font-size: 16px;
      }
    }
    
    .sticker-page-wrapper3 .sticker_wrapper {
      max-width: 35.3125em;
      margin: 0 auto;
      padding: 0 1em 5.625em;
      position: relative;
      min-height: 100%;
    }
    
    .sticker-page-wrapper3 img {
      vertical-align: top;
      max-width: 100%;
      height: auto;
    }
    
    .sticker-page-wrapper3 .bar-code {
      margin: 0 auto;
      width: 24.4375em;
      padding: 1em 0;
    }
    
    .sticker-page-wrapper3 .bar-code img {
      /* width: 100%; */
      width: auto;
      display: block;
    }
    
    .sticker-page-wrapper3 .top-info-text {
      text-align: center;
      border: 1px solid #000;
      background: #eaeceb;
      padding: 0.3333em 0.5em 0.4583em;
      font-size: 1.24em;
      line-height: 1.6667;
    }
    
    .sticker-page-wrapper3 .top-info-text strong {
      font-weight: 500;
      display: block;
    }
    
    .sticker-page-wrapper3 .middle-content {
      font-size: 1.24em;
      line-height: 1.8958;
      padding: 2.2083em 0.3333em 1.125em;
    }
    
    .sticker-page-wrapper3 strong {
      font-weight: 500;
    }
    
    .sticker-page-wrapper3 .middle-content .title-text {
      display: block;
      font-size: 1.1667em;
      line-height: 1.5;
      margin-bottom: 0.0714em;
    }
    
    .sticker-page-wrapper3 .bottom-info-text {
      text-align: center;
      border: 1px solid #000;
      background: #eaeceb;
      font-size: 1.24em;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      line-height: 1.9167;
      padding: 0.25em 0 0.375em;
    }
    
    .sticker-page-wrapper3 .bottom-info-text .data {
      margin: 0 0.75em;
    }
    
    .sticker-page-wrapper3 .bottom-logo {
      margin: 0 auto;
      width: 14.4375em;
      bottom: 1.8125em;
      position: absolute;
      left: 0;
      right: 0;
    }
    
    .sticker-page-wrapper3 .bottom-logo img {
      width: 100%;
    }
    </style><style type="text/css">@font-face { font-family: 'simple-line-icons'; src: url('chrome-extension://mihdfbecejheednfigjpdacgeilhlmnf/assets/fonts/Simple-Line-Icons.ttf') format('truetype'); }</style></head><body><div class="sticker-page-wrapper1">
				<div class="sticker_wrapper">
                    <div class="bar-code">
						<img id="bar-code-image" src="">` + params.shippingId + `					</div>
					<table>
						<tbody>
							<tr>
								<th>מאת ADDICT</th>
								<td><div style="float:left"> DD304122</div><div style="float:right">484312</div></td>
							</tr>
							<tr>
								<th>יוחנן הסנדלר 5 הרצליה</th>
								<td>מ-1-1</td>
							</tr>
							<tr>
								<th>
									עבור:  שקד פרץ								</th>
								<td>
									מושב מבטחים 83  מבטחים								</td>
							</tr>
							<tr>
								<th>מספר קו</th>
								<td>5090</td>
							</tr>
							<tr>
								<th> טלפון: 054-553-1868</th>
								<td>רגיל</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<td colspan="2">
									מושב מבטחים 83  מבטחים &nbsp;|&nbsp; טלפון: 054-553-1868 &nbsp;|&nbsp;  הערות: 								</td>
							</tr>
						</tfoot>
					</table>
					<div class="bottom-logo">
						<img src="./allwp.addictonline.co.il_files/logo.png.webp" alt="addict">
					</div>
					<div>1 מתוך 3 <span class="bottom_date">05-12-2022</span></div>
				</div>
			</div>

						
        <div class="sticker-page-wrapper2">
					<div class="sticker_wrapper">

						<!-- <div class="sticker_date"></div> -->

						<div class="bar_code_wrap">
							<div class="order_detail_info">
								<div class="data_row">
									<strong>עבור:</strong> שקד פרץ								</div>
								<div class="data_row"><strong>מס׳ הזמנה:</strong> 484312</div>
                                 
								<div class="data_row"><strong>מספר הזמנה נוסף:</strong>DD304122</div>
                                 
							</div>
							<div class="bar-code">
								<img id="bar-code-image" src="">` + params.shippingId + `							</div>
						</div>
<!--						<strong class="form_title text-center">נא סמני ב- "X" איזה פריט את מחזירה</strong>-->
                        <strong class="form_title text-center">נא סמני ב- "X" איזה פריט את מחזירה וצרפי את המדבקה הנ"ל לתוך החבילה</strong>
                        <table>
							<thead>
								<tr>
									<th class="sku">מק׳׳ט</th>
									<th class="amount text-center">כמות</th>
									<th class="item_name">שם פריט</th>
									<th class="return text-center">החזרה</th>
									<th class="reason_code">קוד סיבת החזרה</th>
								</tr>
							</thead>
							<tbody>

								                                    <tr>
										<td class="text-center">
											&nbsp;</td>
										<td>&nbsp;1</td>
										<td class="text-center">&nbsp;פוטר אנדי פסים לבן/שחור </td>
										<td>&nbsp;</td>
										<td>&nbsp;</td>
									</tr>
                                                                    <tr>
										<td class="text-center">
											&nbsp;</td>
										<td>&nbsp;1</td>
										<td class="text-center">&nbsp;גולף לסלי שחור O.S</td>
										<td>&nbsp;</td>
										<td>&nbsp;</td>
									</tr>
                                                                    <tr>
										<td class="text-center">
											&nbsp;</td>
										<td>&nbsp;1</td>
										<td class="text-center">&nbsp;גולף לסלי בז' O.S</td>
										<td>&nbsp;</td>
										<td>&nbsp;</td>
									</tr>
                                                                    <tr>
										<td class="text-center">
											&nbsp;</td>
										<td>&nbsp;1</td>
										<td class="text-center">&nbsp;גולף לסלי מוקה O.S</td>
										<td>&nbsp;</td>
										<td>&nbsp;</td>
									</tr>
                                                                    <tr>
										<td class="text-center">
											&nbsp;</td>
										<td>&nbsp;1</td>
										<td class="text-center">&nbsp;סריג קלווין אוברסייז שחור </td>
										<td>&nbsp;</td>
										<td>&nbsp;</td>
									</tr>
                                
							</tbody>
						</table>
						<form action="https://allwp.addictonline.co.il/print/?id=[484312]&amp;t=vcdsxhfsdfhdsjkh43267%202346743267GF#">
							<strong class="form_title text-center">סמני כיצד תרצי לקבל את הזיכוי:</strong>
							<div class="checkbox-row text-center">
								<div class="checkbox_wrap">
									<label>
										<input type="checkbox">
										<span class="fake-input"></span>
										<span class="label-text">זיכוי כספי</span>
									</label>
								</div>
								<div class="checkbox_wrap">
									<label>
										<input type="checkbox">
										<span class="fake-input"></span>
										<span class="label-text">קרדיט באתר</span>
									</label>
								</div>
							</div>
							<div class="bottom-info text-center">החזר כספי בניכוי של 5% משווי הפריט *</div>
							<textarea class="notes_input" placeholder="הערות נוספות:"></textarea>
						</form>
						<div>2 מתוך 3 <span class="bottom_date">05-12-2022</span></div>
						<div class="bottom-logo">
							<img src="./allwp.addictonline.co.il_files/logo.png.webp" alt="addict">
						</div>
					</div>
				</div>
            			<div class="sticker-page-wrapper3">
				<div class="sticker_wrapper">
					<div class="bar-code">
						<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASIAAAAeCAQAAAAieNtfAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAACmSURBVHja7dJBCoMwFEDBpPe/s920oCGo8LYzq2gTtZ83xzH+5m89xxjjsv47773em6ff1uu3e++esX/u+o676/d7d/ev63U2x+OZ/Rz2c3n633ffcDf3/Tc+zWV3fjn7GRCJiExEZCIiExGZiMhERCYiMhGRiYhMRGQiIhMRmYjIREQmIjIRkYmITERkIiITEZmIyEREJiIyEZGJiExEZCIiExHZF/i+KDv040HSAAAAAElFTkSuQmCC">RR0000880841B
					</div>
					<div class="top-info-text">
						תגוביינא רשום מיוחד- אין צורך בבול <strong>אישור מס׳ 16941</strong>
					</div>
					<div class="middle-content">
						<strong class="title-text">לכבוד:</strong>
						אדיקט נ.א בע"מ <br>
						באמצעות בית הדואר <strong>רמת השרון</strong> <br>
						תא דואר <strong>1771</strong> <br>
						רמת השרון <strong>4710001</strong>
					</div>
					<div class="bottom-info-text">
						<div class="data">
							<strong>שם לקוח:</strong> שקד פרץ						</div>
						<div class="data">
							<strong>מס׳ הזמנה:</strong> 484312						</div>
					</div>
					<div style="display:inline-block">3 מתוך 3</div>
                    <div style="display:inline-block; float:left"> DD304122</div>
					<div class="bottom-logo">
						<img src="./allwp.addictonline.co.il_files/logo.png.webp" alt="addict">
					</div>
				</div>
			</div><div id="mttContainer" class="bootstrapiso notranslate" data-original-title="" title="" style="transform: translate(1046px, 293px);" dir="ltr"></div>
      <script src="https://cdn.jsdelivr.net/jsbarcode/3.5.8/JsBarcode.all.min.js"></script>
      <script src="https://code.jquery.com/jquery-3.1.1.min.js" integrity="sha256-hVVnYaiADRTO2PzUGmuLJr8BLUSjGIZsDYGmIJLv2b8=" crossorigin="anonymous"></script>
      <script>
        $('#shopify-section-announcement-bar').html('');
        $('#shopify-section-header').html('');
        $('#shopify-section-footer').html('');
        $('.footer').html('');
        $('#admin-bar-iframe').html('');
        function textToBase64Barcode(text){
          var canvas = document.createElement("canvas");
          JsBarcode(canvas, text, {format: "CODE39"});
          return canvas.toDataURL("image/png");
        }
        $('#bar-code-image').attr('src', textToBase64Barcode('` + params.shippingId + `'))
      </script>
      </body><div id="huntr-react-container-2"></div></html>`;

    if(isExisted < 0 ) 
    {
      const page = new Page({session: session});
      page.title = "print_label";
      page.body_html = html;

      await page.save({
        update: true,
      });
      console.log('====page created======')
    } else {
      const page = pages[isExisted];
      page.body_html = html;

      await page.save({
        update: true,
      });
      console.log('====page updated======')

    }
    console.log('====ok======')
    res.status(200).send();
    
  });
}
