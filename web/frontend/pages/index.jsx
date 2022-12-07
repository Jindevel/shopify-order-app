import { useNavigate, TitleBar, Loading } from '@shopify/app-bridge-react';
import {
	Card,
	EmptyState,
	Layout,
	Page,
	SkeletonBodyText,
	Tabs,
	Select,
	Button,
	TextStyle,
	Icon,
	TextField,
} from "@shopify/polaris";
import { QRCodeIndex } from "../components";
import { useAuthenticatedFetch, useAppQuery } from "../hooks";

import {useState, useCallback} from 'react';
import { SearchMinor, FilterMajor, ImageMajor } from "@shopify/polaris-icons"

export default function HomePage() {
	/*
		Add an App Bridge useNavigate hook to set up the navigate function.
		This function modifies the top-level browser URL so that you can
		navigate within the embedded app and keep the browser in sync on reload.
	*/
	const navigate = useNavigate();
	const fetch = useAuthenticatedFetch();

	const [selectedTab, setSelectedTab] = useState(0);

	const handleTabChange = useCallback(
		(selectedTabIndex) => setSelectedTab(selectedTabIndex),
		[],
	);

	const tabs = [
		{
		id: 'all-orders-1',
		content: 'All',
		accessibilityLabel: 'All orders',
		panelID: 'all-orders-content-1',
		},
		{
		id: 'processing-orders-1',
		content: 'Processing',
		panelID: 'processing-orders-content-1',
		},
		{
		id: 'complete-orders-1',
		content: 'Complete',
		panelID: 'complete-orders-content-1',
		},
	];

	/* useAppQuery wraps react-query and the App Bridge authenticatedFetch function */
	const {
		data: QRCodes,
		isLoading,

		/*
			react-query provides stale-while-revalidate caching.
			By passing isRefetching to Index Tables we can show stale data and a loading state.
			Once the query refetches, IndexTable updates and the loading state is removed.
			This ensures a performant UX.
		*/
		isRefetching,
	} = useAppQuery({
		url: "/api/qrcodes?tabIndex=" + tabs[selectedTab].content,
	});
	console.log(QRCodes);

	const [selectedItem, setSelectedItem] = useState('bulk_actions');

	const handleSelectChange = useCallback((value) => setSelectedItem(value), []);
	const printLabel = async () => {
		const response = await fetch("/api/printLabel?orderId=217992573212", {
			method: "GET",
			body: {
				orderId: 5217992573212,
				shippingId: 54103029,
			}
		});
		console.log(response);
		if (response.ok) {
		console.log('frontend printlabel')
		window.open("https://buffer-order.myshopify.com/pages/print_label", "_blank")
		}
	}
  
	const options = [
	  {label: 'Bulk actions', value: 'bulk_actions'},
	//   {label: 'Move to Trash', value: 'move_to_trash'},
	//   {label: 'print_label', value: 'print_label'},
	//   {label: 'Change status to processing', value: 'change_status_to_processing'},
	//   {label: 'Change status to on-hold', value: 'change_status_to_on_hold'},
	//   {label: 'Change status to complete', value: 'change_status_to_complete'},
	//   {label: 'Change status to cancelled', value: 'change_status_to_cancelled'},
	];

	/* Set the QR codes to use in the list */
	const qrCodesMarkup = QRCodes?.length ? (
		<Card>
			<Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
				<QRCodeIndex QRCodes={QRCodes} loading={isRefetching} />
			</Tabs>
		</Card>
	) : null;

	/* loadingMarkup uses the loading component from AppBridge and components from Polaris  */
	const loadingMarkup = isLoading ? (
		<Card sectioned>
			<Loading />
			<SkeletonBodyText />
		</Card>
	) : null;

	/* Use Polaris Card and EmptyState components to define the contents of the empty state */
	const emptyStateMarkup =
		!isLoading && !QRCodes?.length ? (
			<Card sectioned>
				<EmptyState
					heading="Create unique QR codes for your product"
					/* This button will take the user to a Create a QR code page */
					action={{
						content: "Create QR code",
						onAction: () => navigate("/qrcodes/new"),
					}}
					image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
				>
					<p>
						Allow customers to scan codes and buy products using thier phones.
					</p>
				</EmptyState>
			</Card>
		) : null;

	/*
	Use Polaris Page and TitleBar components to create the page layout,
	and include the empty state contents set above.
	*/
	return (
		<Page fullWidth={true}>
			<TitleBar
				title="QR codes"
				primaryAction={{
					content: "Create QR code",
					onAction: () => navigate("/qrcodes/new")
				}}
			/>
			<Layout>
				<Layout.Section>
					<div style={{display: 'flex'}}>
						<div style={{width: 200}}>
							<Select
								options={options}
								onChange={handleSelectChange}
								value={selectedItem}
							/>
						</div>
						<div style={{height: 50, paddingLeft: 15}}>
							<Button  onClick={printLabel}>
								<div style={{ color: '#2271b1', fontSize: 14}}>
									Apply
								</div>
							</Button>
						</div>
						<div style={{marginLeft: 15}}>
							<TextField
								labelHidden
								type="text"
								// onChange={this.handleChange}
								prefix={<Icon source={SearchMinor} color="inkLightest" />}
								placeholder="search"
								maxHeight={100}
							/>
						</div>
					</div>
				</Layout.Section>
				<Layout.Section>
					{loadingMarkup}
					{qrCodesMarkup}
					{emptyStateMarkup}
				</Layout.Section>
			</Layout>
		</Page>
	)
}