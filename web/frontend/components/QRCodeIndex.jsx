import { useNavigate } from "@shopify/app-bridge-react";
import {
  Card,
  IndexTable,
  Stack,
  TextStyle,
  UnstyledLink,
  useIndexResourceState,
} from "@shopify/polaris";
import { DiamondAlertMajor, ImageMajor } from "@shopify/polaris-icons";

/* useMedia is used to support multiple screen sizes */
import { useMedia } from "@shopify/react-hooks";

/* dayjs is used to capture and format the date a QR code was created or modified */
import dayjs from "dayjs";

/* Markup for small screen sizes (mobile) */
function SmallScreenCard({
  id,
  name,
  date,
  customer,
  total,
  payment_status,
  fullfillment_status,
  items,
  delivery_method,
  tags
}) {
  return (
    <UnstyledLink onClick={() => navigate(`/qrcodes/${id}`)}>
      <div
        style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #E1E3E5" }}
      >
        <Stack>
          {/* <Stack.Item>
            <Thumbnail
              source={product?.images?.edges[0]?.node?.url || ImageMajor}
              alt="placeholder"
              color="base"
              size="small"
            />
          </Stack.Item> */}
          <Stack.Item fill>
            <Stack vertical={true}>
              <Stack.Item>
                <p>
                  <TextStyle variation="strong">
                    {truncate(name, 35)}
                  </TextStyle>
                </p>
                <p>{truncate(product?.title, 35)}</p>
                <p>{dayjs(createdAt).format("MMMM D, YYYY")}</p>
              </Stack.Item>
              <div style={{ display: "flex" }}>
                <div style={{ flex: "3" }}>
                  <TextStyle variation="subdued">Discount</TextStyle>
                  <p>{discountCode || "-"}</p>
                </div>
                <div style={{ flex: "2" }}>
                  <TextStyle variation="subdued">Scans</TextStyle>
                  <p>{scans}</p>
                </div>
              </div>
            </Stack>
          </Stack.Item>
        </Stack>
      </div>
    </UnstyledLink>
  );
}

export function QRCodeIndex({ QRCodes, loading }) {
  const navigate = useNavigate();

  /* Check if screen is small */
  const isSmallScreen = useMedia("(max-width: 640px)");

  /* Map over QRCodes for small screen */
  const smallScreenMarkup = QRCodes.map((QRCode) => (
    <SmallScreenCard key={QRCode.id} navigate={navigate} {...QRCode} />
  ));

  const resourceName = {
    singular: "QR code",
    plural: "QR codes",
  };

  const {selectedResources, allResourcesSelected, handleSelectionChange} = useIndexResourceState(QRCodes);
  console.log(selectedResources);

  const rowMarkup = QRCodes.map(
    ({ id, name, createdAt, total_price, total_weight, fulfillment_status, shiping_lines, tags }, index) => {

      /* The form layout, created using Polaris components. Includes the QR code data set above. */
      return (
        <IndexTable.Row
          id={id}
          key={id}
          selected={selectedResources.includes(id)}
          position={index}
          // onClick={() => {
          //   navigate(`/qrcodes/${id}`);
          // }}
        >
          <IndexTable.Cell>
            <UnstyledLink data-primary-link url={`/qrcodes/${id}`}>
              {truncate(name, 25)}
            </UnstyledLink>
          </IndexTable.Cell>
          <IndexTable.Cell>
            {dayjs(createdAt).format("dddd") + " at " + dayjs(createdAt).format("h:mm a")}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {fulfillment_status == null ? 
              <div style={{ display: 'inline', backgroundColor: "#c8e3ca", fontSize: 13, textAlign: 'center', borderRadius: 3, paddingTop: 5, paddingLeft: 10, paddingRight: 10, paddingBottom: 5, color: '#5f8147' }}>
                processing
              </div> : <div style={{ display: 'inline', backgroundColor: "#eee", fontSize: 13, textAlign: 'center', borderRadius: 3, paddingTop: 5, paddingLeft: 10, paddingRight: 10, paddingBottom: 5, color: '#b7b7b7' }}>
                complete
              </div>}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {"$"}{total_price}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {'54103029'}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {total_weight}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {shiping_lines}
          </IndexTable.Cell>
          <IndexTable.Cell>
            {tags}
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );

  /* A layout for small screens, built using Polaris components */
  return (
    <Card>
      {isSmallScreen ? (
        smallScreenMarkup
      ) : (
          <IndexTable
            resourceName={resourceName}
            itemCount={QRCodes.length}
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "Order"},
              { title: "Date" },
              { title: "Status" },
              { title: "Total" },
              { title: "shipping number" },
              { title: "Weight" },
              { title: "Affiliate Referral" },
              { title: "Delivery method" },
              { title: "Tags" },
            ]}
            loading={loading}
          >
            {rowMarkup}
          </IndexTable>
      )}
    </Card>
  );
}

/* A function to truncate long strings */
function truncate(str, n) {
  return str.length > n ? str.substr(0, n - 1) + "…" : str;
}
