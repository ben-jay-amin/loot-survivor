import { ReactElement, useState } from "react";
import { useContracts } from "../hooks/useContracts";
import {
  getKeyFromValue,
  getItemData,
  getValueFromKey,
  getItemPrice,
  padAddress,
} from "../lib/utils";
import { GameData } from "../components/GameData";
import VerticalKeyboardControl from "../components/menu/VerticalMenu";
import { useTransactionManager, useContractWrite } from "@starknet-react/core";
import useCustomQuery from "../hooks/useCustomQuery";
import {
  getAdventurerById,
  getLatestMarketItems,
} from "../hooks/graphql/queries";
import useLoadingStore from "../hooks/useLoadingStore";
import useAdventurerStore from "../hooks/useAdventurerStore";
import useTransactionCartStore from "../hooks/useTransactionCartStore";
import Info from "../components/adventurer/Info";
import { Button } from "../components/buttons/Button";
import { useMediaQuery } from "react-responsive";
import {
  ArrowTargetIcon,
  CatIcon,
  CoinIcon,
  CoinCharismaIcon,
  HeartVitalityIcon,
  LightbulbIcon,
  ScrollIcon,
  ArrowIcon,
} from "../components/icons/Icons";
import PurchaseHealth from "../components/actions/PurchaseHealth";
import MarketplaceScreen from "./MarketplaceScreen";
import { UpgradeNav } from "../components/upgrade/UpgradeNav";
import { useQueriesStore } from "../hooks/useQueryStore";
import useUIStore from "../hooks/useUIStore";

/**
 * @container
 * @description Provides the upgrade screen for the adventurer.
 */
export default function UpgradeScreen() {
  const { gameContract } = useContracts();
  const adventurer = useAdventurerStore((state) => state.adventurer);
  const currentLevel = useAdventurerStore(
    (state) => state.computed.currentLevel
  );
  const startLoading = useLoadingStore((state) => state.startLoading);
  const setTxHash = useLoadingStore((state) => state.setTxHash);
  const loading = useLoadingStore((state) => state.loading);
  const txAccepted = useLoadingStore((state) => state.txAccepted);
  const { addTransaction } = useTransactionManager();
  const calls = useTransactionCartStore((state) => state.calls);
  const addToCalls = useTransactionCartStore((state) => state.addToCalls);
  const handleSubmitCalls = useTransactionCartStore(
    (state) => state.handleSubmitCalls
  );
  const hasStatUpgrades = useAdventurerStore(
    (state) => state.computed.hasStatUpgrades
  );
  const { writeAsync } = useContractWrite({ calls });
  const [selected, setSelected] = useState("");
  const maxHealth = 100 + (adventurer?.vitality ?? 0) * 10;
  const [upgradeScreen, setUpgradeScreen] = useState(1);
  const setScreen = useUIStore((state) => state.setScreen);

  const { resetDataUpdated } = useQueriesStore();

  const gameData = new GameData();

  // useCustomQuery(
  //   "adventurerByIdQuery",
  //   getAdventurerById,
  //   {
  //     id: adventurer?.id ?? 0,
  //   },
  //   txAccepted
  // );

  useCustomQuery(
    "latestMarketItemsQuery",
    getLatestMarketItems,
    {
      adventurerId: adventurer?.id,
      // limit: 20 * (adventurer?.statUpgrades ?? 0),
      limit: 20,
    },
    txAccepted
  );

  const handleUpgradeTx = async (selected: any) => {
    const upgradeTx = {
      contractAddress: gameContract?.address ?? "",
      entrypoint: "upgrade_stat",
      calldata: [
        adventurer?.id?.toString() ?? "",
        "0",
        getKeyFromValue(gameData.STATS, selected) ?? "",
        "1",
      ],
    };
    addToCalls(upgradeTx);
    startLoading(
      "Upgrade",
      `Upgrading ${selected}`,
      "adventurerByIdQuery",
      adventurer?.id,
      `You upgraded ${selected}!`
    );
    handleSubmitCalls(writeAsync).then((tx: any) => {
      if (tx) {
        setTxHash(tx.transaction_hash);
        addTransaction({
          hash: tx.transaction_hash,
          metadata: {
            method: "Upgrade Stat",
            description: `Upgrading ${selected}`,
          },
        });
      }
    });
    resetDataUpdated("adventurerByIdQuery");
  };

  const Attribute = ({
    name,
    icon,
    description,
    buttonText,
  }: any): ReactElement => (
    <div className="flex flex-col gap-1 sm:gap-3 items-center">
      <span className="hidden sm:block w-10 h-10">{icon}</span>
      <p className="sm:text-[28px] text-center h-2/3">{description}</p>
      <Button onClick={() => handleUpgradeTx(name)}>{buttonText}</Button>
    </div>
  );

  const attributes = [
    {
      name: "Strength",
      icon: <ArrowTargetIcon />,
      description: "Strength increases attack damage by 10%",
      buttonText: "Upgrade Strength",
    },
    {
      name: "Dexterity",
      icon: <CatIcon />,
      description: "Dexterity increases chance of fleeing Beasts",
      buttonText: "Upgrade Dexterity",
    },
    {
      name: "Vitality",
      icon: <HeartVitalityIcon />,
      description: "Vitality gives 10hp and increases max health by 10hp",
      buttonText: "Upgrade Vitality",
    },
    {
      name: "Intelligence",
      icon: <LightbulbIcon />,
      description: "Intelligence increases chance of avoiding Obstacles",
      buttonText: "Upgrade Intelligence",
    },
    {
      name: "Wisdom",
      icon: <ScrollIcon />,
      description: "Wisdom increases chance of avoiding a Beast ambush",
      buttonText: "Upgrade Wisdom",
    },
    {
      name: "Charisma",
      icon: <CoinCharismaIcon />,
      description: "Charisma provides discounts on the marketplace and potions",
      buttonText: "Upgrade Charisma",
    },
  ];

  const isMobileDevice = useMediaQuery({
    query: "(max-device-width: 480px)",
  });

  const previousLevel = currentLevel - (adventurer?.statUpgrades ?? 0);

  function renderContent() {
    const attribute = attributes.find((attr) => attr.name === selected);
    return (
      <div className="flex sm:w-2/3 h-24 sm:h-full items-center justify-center border-l border-terminal-green p-2">
        {attribute && <Attribute {...attribute} />}
      </div>
    );
  }

  function renderVerticalKeyboardControl() {
    const upgradeMenu = [
      {
        id: 1,
        label: `Strength - ${adventurer?.strength}`,
        icon: <ArrowTargetIcon />,
        value: "Strength",
        action: async () => setSelected("Strength"),
        disabled: false,
      },
      {
        id: 2,
        label: `Dexterity - ${adventurer?.dexterity}`,
        icon: <CatIcon />,
        value: "Dexterity",
        action: async () => setSelected("Dexterity"),
        disabled: false,
      },
      {
        id: 3,
        label: `Vitality - ${adventurer?.vitality}`,
        icon: <HeartVitalityIcon />,
        value: "Vitality",
        action: async () => setSelected("Vitality"),
        disabled: false,
      },
      {
        id: 4,
        label: `Intelligence - ${adventurer?.intelligence}`,
        icon: <LightbulbIcon />,
        value: "Intelligence",
        action: async () => setSelected("Intelligence"),
        disabled: false,
      },
      {
        id: 5,
        label: `Wisdom - ${adventurer?.wisdom}`,
        icon: <ScrollIcon />,
        value: "Wisdom",
        action: async () => setSelected("Wisdom"),
        disabled: false,
      },
      {
        id: 6,
        label: `Charisma - ${adventurer?.charisma}`,
        icon: <CoinCharismaIcon />,
        value: "Charisma",
        action: async () => setSelected("Charisma"),
        disabled: false,
      },
    ];
    return (
      <div className="sm:w-1/3">
        <VerticalKeyboardControl
          buttonsData={upgradeMenu}
          onSelected={setSelected}
          onEnterAction={true}
        />
      </div>
    );
  }

  const itemsFilter = calls.filter((call) => call.entrypoint === "buy_item");

  const potionsCall = calls.find((call) => call.entrypoint === "buy_potions");

  const potionsFilter =
    potionsCall &&
    Array.isArray(potionsCall.calldata) &&
    potionsCall.calldata[2];

  const getPurchasedGoldSum = () => {
    if (potionsCall) {
      const value = potionsFilter;
      const parsedValue = value ? parseInt(value.toString(), 10) : 0;
      const purchaseGoldAmount =
        parsedValue *
        Math.max(currentLevel - 2 * (adventurer?.charisma ?? 0), 1);
      return purchaseGoldAmount;
    } else {
      return 0;
    }
  };

  const itemsGoldSum = itemsFilter.reduce((accumulator, current) => {
    const value = Array.isArray(current.calldata) && current.calldata[2];
    const parsedValue = value ? parseInt(value.toString(), 10) : 0;
    const { tier } = getItemData(
      getValueFromKey(gameData.ITEMS, parsedValue) ?? ""
    );
    const itemPrice = getItemPrice(tier, adventurer?.charisma ?? 0);
    return accumulator + (isNaN(itemPrice) ? 0 : itemPrice);
  }, 0);

  const upgradeTotalCost = getPurchasedGoldSum() + itemsGoldSum;

  return (
    <>
      {hasStatUpgrades ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-1/3 hidden sm:block">
            <Info adventurer={adventurer} upgradeCost={upgradeTotalCost} />
          </div>
          <div className="w-full sm:w-2/3">
            <div className="flex flex-col gap-2 h-full">
              <div className="justify-center text-terminal-green space-x-3">
                <div className="text-center text-2xl md:text-xl lg:text-4xl sm:p-2 animate-pulse uppercase">
                  Level up!
                </div>
                <div className="flex flex-row gap-2 justify-center text-lg sm:text-2xl text-shadow-none">
                  <span>
                    Stat Upgrades Available {adventurer?.statUpgrades}
                  </span>
                </div>
                <UpgradeNav activeSection={upgradeScreen} />
                <div className="flex flex-row gap-3 text-sm sm:text-base justify-center">
                  <div className="flex flex-row gap-3">
                    <span className="flex flex-row gap-1  items-center">
                      <p className="uppercase">Cost:</p>
                      <span className="flex text-xl">
                        <CoinIcon className="self-center w-5 h-5 fill-current text-terminal-yellow" />
                        <p
                          className={
                            upgradeTotalCost > (adventurer?.gold ?? 0)
                              ? "text-red-600"
                              : "text-terminal-yellow"
                          }
                        >
                          {upgradeTotalCost}
                        </p>
                      </span>
                    </span>
                    <span className="flex flex-row gap-1  items-center">
                      <p className="uppercase">Potions:</p>
                      <span className="flex text-xl text-terminal-yellow">
                        {potionsFilter ?? 0}
                      </span>
                    </span>
                    <span className="flex flex-row gap-1 items-center">
                      <p className="uppercase">Items:</p>
                      <span className="flex text-xl text-terminal-yellow">
                        {itemsFilter.length}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <span className="flex flex-row sm:gap-1">
                      {`Charisma: ${adventurer?.charisma} -`}
                      <CoinIcon className="w-5 h-5 fill-current text-terminal-yellow" />
                      <p className="text-terminal-yellow">
                        {adventurer?.charisma && adventurer?.charisma * 2}
                      </p>
                      <p className="hidden sm:block">{" to price"}</p>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {upgradeScreen === 1 && (
                  <div className="flex flex-col gap-5 sm:gap-2 sm:flex-row items-center justify-center flex-wrap">
                    <p className="text-xl lg:text-2xl">Potions</p>
                    <PurchaseHealth upgradeTotalCost={upgradeTotalCost} />
                  </div>
                )}

                {((!isMobileDevice && upgradeScreen === 1) ||
                  (isMobileDevice && upgradeScreen === 2)) && (
                  <div className="flex flex-col items-center sm:gap-2 w-full">
                    <p className="text-xl lg:text-2xl sm:hidden">
                      Loot Fountain
                    </p>
                    <MarketplaceScreen upgradeTotalCost={upgradeTotalCost} />
                  </div>
                )}
                {((!isMobileDevice && upgradeScreen === 2) ||
                  (isMobileDevice && upgradeScreen === 3)) && (
                  <div className="flex flex-col sm:gap-2 items-center w-full">
                    <p className="text-xl lg:text-2xl sm:hidden">
                      Stat Upgrades
                    </p>
                    <div className="flex flex-col gap-0 sm:flex-row w-full border-terminal-green border">
                      {isMobileDevice ? (
                        <>
                          {renderContent()}
                          {renderVerticalKeyboardControl()}
                        </>
                      ) : (
                        <>
                          {renderVerticalKeyboardControl()}
                          {renderContent()}
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="w-1/2 flex flex-row gap-2 mx-auto">
                  <Button
                    className="w-1/2"
                    onClick={() => setUpgradeScreen(upgradeScreen - 1)}
                    disabled={upgradeScreen == 1}
                  >
                    Back
                  </Button>
                  <Button
                    className="w-1/2"
                    onClick={() => setUpgradeScreen(upgradeScreen + 1)}
                    disabled={
                      isMobileDevice ? upgradeScreen == 3 : upgradeScreen == 2
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <h1 className="mx-auto">No upgrades available!</h1>
      )}
    </>
  );
}