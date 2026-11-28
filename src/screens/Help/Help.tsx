import { useState } from "react";
import {
    SearchIcon, InboxIcon, ArrowDownToLine, ArrowUpFromLine,
    CarIcon, Layers, Settings2,
} from "lucide-react";

interface Section {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    steps: { heading: string; body: string }[];
}

const SECTIONS: Section[] = [
    {
        id: "search",
        icon: SearchIcon,
        title: "Parcel Search",
        steps: [
            {
                heading: "Finding a parcel",
                body: "Type any part of the recipient's name, phone number, parcel ID, or driver name into the search bar. Results update automatically after a short pause.",
            },
            {
                heading: "Advanced filters",
                body: "Click 'Show Filters' to narrow results by status (Registered, Called, Assigned, POD, Picked Up, Delivered), shelf location, receiver name, or a date range.",
            },
            {
                heading: "Viewing parcel details",
                body: "Click the 'View' button on any row to open the detail panel. From there you can see sender/receiver info, costs, driver, shelf, and attached images.",
            },
            {
                heading: "Marking a parcel as picked up",
                body: "Open the detail panel and click 'Mark Picked Up'. Choose whether the owner or a third party is collecting, fill in the required details, then confirm.",
            },
            {
                heading: "Requesting home delivery",
                body: "Open the detail panel, click 'Actions → Request Home Delivery', enter the delivery address and fee, then confirm.",
            },
            {
                heading: "Updating shelf location",
                body: "Open the detail panel, click 'Actions → Update Shelf', select the new shelf from the list, and save.",
            },
            {
                heading: "Printing labels",
                body: "Select one or more parcels using the checkboxes, then click 'Print Labels'. You can also print a single label from inside the detail panel.",
            },
            {
                heading: "Exporting to CSV",
                body: "Click the 'Export' button to download the currently visible parcel list as a CSV file.",
            },
        ],
    },
    {
        id: "intake",
        icon: InboxIcon,
        title: "Parcel Intake",
        steps: [
            {
                heading: "Registering a new parcel",
                body: "Fill in the recipient name, phone number, and shelf location — these are required. Sender details, description, weight, and images are optional but recommended.",
            },
            {
                heading: "Driver information",
                body: "Enter the driver name, phone, and vehicle number for the parcel. If you are registering multiple parcels for the same driver, the driver details carry over automatically after the first entry.",
            },
            {
                heading: "Home delivery option",
                body: "Toggle 'Home Delivery' if the parcel needs to be delivered to the recipient's address. Enter the delivery address and fee when prompted.",
            },
            {
                heading: "Adding multiple parcels",
                body: "After filling in a parcel, click 'Add to Queue'. The parcel is held in a session list. Keep adding parcels, then click 'Save All' once to submit the entire batch.",
            },
            {
                heading: "Saving",
                body: "Click 'Save All' to submit all queued parcels to the system. If you navigate away with unsaved parcels, the system will warn you and offer to save or discard.",
            },
        ],
    },
    {
        id: "incoming",
        icon: ArrowDownToLine,
        title: "Incoming Parcels",
        steps: [
            {
                heading: "What this page shows",
                body: "All parcels currently being transferred to your station from another branch. Parcels are grouped by driver.",
            },
            {
                heading: "Filtering by status",
                body: "Use the 'All', 'In Transit', and 'Arrived' tabs to filter the list. In Transit means the parcel is still on the way; Arrived means it has been received at your station.",
            },
            {
                heading: "Expanding a driver group",
                body: "Click the arrow next to a driver's name to expand the group and see the individual parcels they are carrying.",
            },
            {
                heading: "Marking parcels as arrived",
                body: "Select one or more in-transit parcels using the checkboxes, then click 'Assign to Shelf'. Pick a shelf from the grid and confirm. The parcels will be marked as arrived and placed on that shelf.",
            },
            {
                heading: "Viewing parcel details",
                body: "Click 'View Details' on any parcel row to see the full breakdown including sender, receiver, route, driver, and cost information.",
            },
        ],
    },
    {
        id: "outgoing",
        icon: ArrowUpFromLine,
        title: "Outgoing Parcels",
        steps: [
            {
                heading: "What this page shows",
                body: "Parcels at your station that are ready to be transferred to another branch. They are grouped by destination station.",
            },
            {
                heading: "Assigning a driver",
                body: "Select parcels using the checkboxes, then use the 'Assign Driver' button to bulk-assign a driver to all selected parcels at once.",
            },
            {
                heading: "Starting a new transfer",
                body: "Click 'New Transfer' to open the transfer form in a modal. Select the destination station and the parcels to include, then confirm.",
            },
            {
                heading: "Printing a manifest",
                body: "Once parcels are grouped and a driver is assigned, click 'Print Manifest' to generate a printable manifest for the driver.",
            },
            {
                heading: "Printing parcel labels",
                body: "Click the printer icon on any parcel row to print its label. You can also select multiple parcels and print their labels in bulk.",
            },
        ],
    },
    {
        id: "driver-tracker",
        icon: CarIcon,
        title: "Driver Tracker",
        steps: [
            {
                heading: "What this page shows",
                body: "A list of all drivers who have brought parcels to your station, along with the parcels they carried and the total amount owed for that delivery run.",
            },
            {
                heading: "Viewing a driver's parcels",
                body: "Click on a driver to expand their detail view. You can see every parcel they brought in, the inbound cost per parcel, and any POD (Pay on Delivery) amounts.",
            },
            {
                heading: "Confirming payment",
                body: "After reviewing the parcels, confirm the total payment to the driver. The system calculates the amount automatically based on inbound costs and POD collections.",
            },
        ],
    },
    {
        id: "shelf",
        icon: Layers,
        title: "Shelf Management",
        steps: [
            {
                heading: "Adding a shelf",
                body: "Click 'Add New Shelf', enter a shelf name (e.g. A1, B3), and save. The shelf will immediately be available when registering or updating parcels.",
            },
            {
                heading: "Viewing parcels on a shelf",
                body: "Click on any shelf card to see all parcels currently assigned to it.",
            },
            {
                heading: "Deleting a shelf",
                body: "Click the delete icon on a shelf card. A shelf can only be deleted if it has no parcels assigned to it.",
            },
        ],
    },
    {
        id: "settings",
        icon: Settings2,
        title: "Settings",
        steps: [
            {
                heading: "Visual Identity (Manager only)",
                body: "Upload your branch logo and set the branch name. The logo appears in the sidebar and on printed labels. You can upload an image file or paste a URL.",
            },
            {
                heading: "Branch Info (Manager only)",
                body: "Set the branch address, phone number, email, and operating hours. This information appears on printed labels and customer-facing pages.",
            },
            {
                heading: "Printing (Manager only)",
                body: "Set the company tagline and footer note that appear on every printed label and manifest.",
            },
            {
                heading: "Preferences",
                body: "Toggle email notifications, and set your preferred language and time zone. These settings apply to your account only.",
            },
            {
                heading: "Saving changes",
                body: "Click 'Save' at the bottom of the page to apply your changes. An 'Unsaved' badge appears whenever you have pending changes.",
            },
        ],
    },
];

const SectionBlock = ({ section }: { section: Section }) => {
    const Icon = section.icon;

    return (
        <div className="py-8 border-b border-[#d9d0c0] last:border-0">
            {/* Section heading */}
            <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 border border-orange-100">
                    <Icon className="h-4 w-4 text-[#ea690c]" />
                </div>
                <h2 className="text-base font-bold text-neutral-900">{section.title}</h2>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 pl-1">
                {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 border border-orange-100 text-[10px] font-bold text-[#ea690c]">
                            {i + 1}
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-neutral-800 mb-0.5">{step.heading}</p>
                            <p className="text-sm text-[#5d5d5d] leading-relaxed">{step.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Help = (): JSX.Element => {
    const [query, setQuery] = useState("");

    const filtered = query.trim().length < 2
        ? SECTIONS
        : SECTIONS.filter(s =>
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.steps.some(step =>
                step.heading.toLowerCase().includes(query.toLowerCase()) ||
                step.body.toLowerCase().includes(query.toLowerCase())
            )
        );

    return (
        <div className="w-full min-h-screen bg-white">
            <div className="px-6 py-8 sm:px-10 lg:px-16 lg:py-10">

                {/* Header + search */}
                <div className="mb-6 flex justify-center">
                    <div className="relative w-full sm:w-72">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a8a8]" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search the guide…"
                            className="w-full h-10 rounded-lg border border-[#dcdcdc] bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea690c]/20 focus:border-[#ea690c]"
                        />
                    </div>
                </div>

                {/* Sections */}
                {filtered.length === 0 ? (
                    <p className="text-sm text-[#9a9a9a] text-center py-16">No results for "{query}"</p>
                ) : (
                    filtered.map(section => <SectionBlock key={section.id} section={section} />)
                )}
            </div>
        </div>
    );
};
