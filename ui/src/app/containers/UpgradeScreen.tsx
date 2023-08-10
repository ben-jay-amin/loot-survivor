import { ReactElement, useEffect, useState } from "react";
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
import {
  useTransactionManager,
  useContractWrite,
  useWaitForTransaction,
} from "@starknet-react/core";
import useCustomQuery from "../hooks/useCustomQuery";
import { getLatestMarketItems } from "../hooks/graphql/queries";
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
  HealthPotionIcon,
} from "../components/icons/Icons";
import LootIcon from "../components/icons/LootIcon";
import PurchaseHealth from "../components/actions/PurchaseHealth";
import MarketplaceScreen from "./MarketplaceScreen";
import { UpgradeNav } from "../components/upgrade/UpgradeNav";
import { useQueriesStore } from "../hooks/useQueryStore";
import { StatAttribute } from "../components/upgrade/StatAttribute";
import useUIStore from "../hooks/useUIStore";
import { UpgradeSummary, ItemPurchase } from "../types";

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
  const loading = useLoadingStore((state) => state.loading);
  const startLoading = useLoadingStore((state) => state.startLoading);
  const setTxHash = useLoadingStore((state) => state.setTxHash);
  const txAccepted = useLoadingStore((state) => state.txAccepted);
  const { addTransaction } = useTransactionManager();
  const calls = useTransactionCartStore((state) => state.calls);
  const addToCalls = useTransactionCartStore((state) => state.addToCalls);
  const removeEntrypointFromCalls = useTransactionCartStore(
    (state) => state.removeEntrypointFromCalls
  );
  const handleSubmitCalls = useTransactionCartStore(
    (state) => state.handleSubmitCalls
  );
  const hasStatUpgrades = useAdventurerStore(
    (state) => state.computed.hasStatUpgrades
  );
  const { writeAsync } = useContractWrite({ calls });
  const [selected, setSelected] = useState("");
  const [upgradeScreen, setUpgradeScreen] = useState(1);
  const [potionAmount, setPotionAmount] = useState(0);
  const upgradeStats = useUIStore((state) => state.upgradeStats);
  const setUpgradeStats = useUIStore((state) => state.setUpgradeStats);
  const purchaseItems = useUIStore((state) => state.purchaseItems);
  const setPurchaseItems = useUIStore((state) => state.setPurchaseItems);
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});
  const pendingMessage = useLoadingStore((state) => state.pendingMessage);
  const [summary, setSummary] = useState<UpgradeSummary>({
    Stats: {},
    Items: [],
    Potions: 0,
  });

  const { resetDataUpdated } = useQueriesStore();

  const gameData = new GameData();

  useCustomQuery(
    "latestMarketItemsQuery",
    getLatestMarketItems,
    {
      adventurerId: adventurer?.id,
      limit: 20 * (adventurer?.statUpgrades ?? 0),
    },
    txAccepted
  );

  const checkTransacting =
    typeof pendingMessage === "string" &&
    (pendingMessage as string).startsWith("Upgrading");

  const attributes = [
    {
      name: "Strength",
      icon: <ArrowTargetIcon />,
      description: "Strength increases attack damage by 10%",
      buttonText: "Upgrade Strength",
      abbrev: "STR",
    },
    {
      name: "Dexterity",
      icon: <CatIcon />,
      description: "Dexterity increases chance of fleeing Beasts",
      buttonText: "Upgrade Dexterity",
      abbrev: "DEX",
    },
    {
      name: "Vitality",
      id: 3,
      icon: <HeartVitalityIcon />,
      description: "Vitality gives 10hp and increases max health by 10hp",
      buttonText: "Upgrade Vitality",
      abbrev: "VIT",
    },
    {
      name: "Intelligence",
      icon: <LightbulbIcon />,
      description: "Intelligence increases chance of avoiding Obstacles",
      buttonText: "Upgrade Intelligence",
      abbrev: "INT",
    },
    {
      name: "Wisdom",
      icon: <ScrollIcon />,
      description: "Wisdom increases chance of avoiding a Beast ambush",
      buttonText: "Upgrade Wisdom",
      abbrev: "WIS",
    },
    {
      name: "Charisma",
      icon: <CoinCharismaIcon />,
      description: "Charisma provides discounts on the marketplace and potions",
      buttonText: "Upgrade Charisma",
      abbrev: "CHA",
    },
  ];

  const isMobileDevice = useMediaQuery({
    query: "(max-device-width: 480px)",
  });

  function renderContent() {
    const attribute = attributes.find((attr) => attr.name === selected);
    const amount = attribute ? upgrades[attribute.name] ?? 0 : 0;
    return (
      <div className="flex sm:w-2/3 h-24 sm:h-full items-center justify-center p-auto">
        {attribute && (
          <StatAttribute
            amount={amount}
            setAmount={setUpgrades}
            upgrades={upgradeStats}
            setUpgrades={setUpgradeStats}
            upgradeHandler={handleAddItemsAndTx}
            {...attribute}
          />
        )}
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
      <div className="sm:w-1/3 sm:border-r sm:border-terminal-green">
        <VerticalKeyboardControl
          buttonsData={upgradeMenu}
          onSelected={setSelected}
          onEnterAction={true}
        />
      </div>
    );
  }

  const selectedCharisma = upgrades["Charisma"] ?? 0;
  const selectedVitality = upgrades["Vitality"] ?? 0;

  const totalVitality = (adventurer?.vitality ?? 0) + selectedVitality;
  const totalCharisma = (adventurer?.charisma ?? 0) + selectedCharisma;

  const purchaseGoldAmount =
    potionAmount * Math.max(currentLevel - 2 * totalCharisma, 1);

  const itemsGoldSum = purchaseItems.reduce((accumulator, current) => {
    const { tier } = getItemData(
      getValueFromKey(gameData.ITEMS, parseInt(current.item)) ?? ""
    );
    const itemPrice = getItemPrice(tier, totalCharisma);
    return accumulator + (isNaN(itemPrice) ? 0 : itemPrice);
  }, 0);

  const upgradeTotalCost = purchaseGoldAmount + itemsGoldSum;

  const handleAddItemsAndTx = (upgrades?: any[], items?: any[]) => {
    removeEntrypointFromCalls("buy_items_and_upgrade_stats");
    const buyItemsAndUpgradeTx = {
      contractAddress: gameContract?.address ?? "",
      entrypoint: "buy_items_and_upgrade_stats",
      calldata: [
        adventurer?.id?.toString() ?? "",
        "0",
        potionAmount,
        items ? items.length.toString() : purchaseItems.length.toString(),
        ...(items
          ? items.flatMap(Object.values)
          : purchaseItems.flatMap(Object.values)),
        upgrades ? upgrades.length.toString() : upgradeStats.length.toString(),
        ...(upgrades ? upgrades : upgradeStats),
      ],
      // calldata: [adventurer?.id?.toString() ?? "", "0", "0", "0", "0"],
    };
    addToCalls(buyItemsAndUpgradeTx);
  };

  const handleBuyItemsAndUpgradeTx = async () => {
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
    renderSummary();
    setPurchaseItems([]);
    setUpgradeStats([]);
    setUpgrades({});
  };

  const lastPage = isMobileDevice ? upgradeScreen == 3 : upgradeScreen == 2;

  const nextDisabled = upgradeStats.length !== adventurer?.statUpgrades;

  useEffect(() => {
    if (upgradeStats.length === 0) {
      setUpgradeScreen(1);
    }
  }, [upgradeStats]);

  const renderSummary = () => {
    setSummary({
      Stats: upgrades,
      Items: purchaseItems,
      Potions: potionAmount,
    });
  };

  return (
    <>
      {hasStatUpgrades ? (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2">
          <div className="w-1/3 hidden sm:block">
            <Info adventurer={adventurer} upgradeCost={upgradeTotalCost} />
          </div>
          {!checkTransacting ? (
            <div className="w-full sm:w-2/3">
              <div className="flex flex-col gap-2 h-full">
                <div className="justify-center text-terminal-green space-x-3">
                  <div className="text-center text-2xl md:text-xl lg:text-4xl sm:p-2 animate-pulse uppercase">
                    Level up!
                  </div>
                  <div className="flex flex-row gap-2 justify-center text-lg sm:text-2xl text-shadow-none">
                    <span>
                      Stat Upgrades Available{" "}
                      {(adventurer?.statUpgrades ?? 0) - upgradeStats.length}
                    </span>
                  </div>
                  <UpgradeNav activeSection={upgradeScreen} />
                  <div className="flex flex-row gap-3 text-sm sm:text-base justify-center">
                    <div className="flex flex-row gap-3">
                      {/* <span className="flex flex-row gap-1 items-center">
                        <p className="uppercase">Stats:</p>
                        {Object.entries(upgrades).length > 0 ? (
                          Object.entries(upgrades).map(([key, value]) => (
                            <div key={key}>
                              {`${
                                attributes.find((a) => a.name === key)?.abbrev
                              }x${value}`}
                            </div>
                          ))
                        ) : (
                          <p>-</p>
                        )}
                      </span> */}
                      <span className="flex flex-row gap-1 items-center">
                        <p className="uppercase">Cost:</p>
                        <span className="flex flex-row items-center text-xl">
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
                      <span className="flex flex-row gap-1 items-center">
                        <p className="uppercase">Potions:</p>
                        <span className="flex text-xl text-terminal-yellow">
                          {potionAmount?.toString() ?? 0}
                        </span>
                      </span>
                      <span className="flex flex-row gap-1 items-center">
                        <p className="uppercase">Items:</p>
                        <span className="flex text-xl text-terminal-yellow">
                          {purchaseItems?.length}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {upgradeScreen === 1 && (
                    <div className="flex flex-col sm:gap-2 items-center w-full">
                      <p className="text-xl lg:text-2xl sm:hidden">
                        Stat Upgrades
                      </p>
                      <div className="flex flex-col gap-0 sm:flex-row w-full border-terminal-green border sm:items-center">
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

                  {upgradeScreen === 2 && (
                    <div className="flex flex-col gap-5 sm:gap-2 sm:flex-row items-center justify-center flex-wrap">
                      <p className="text-xl lg:text-2xl">Potions</p>
                      <PurchaseHealth
                        upgradeTotalCost={upgradeTotalCost}
                        potionAmount={potionAmount}
                        setPotionAmount={setPotionAmount}
                        totalCharisma={totalCharisma}
                        totalVitality={totalVitality}
                      />
                    </div>
                  )}

                  {((!isMobileDevice && upgradeScreen === 2) ||
                    (isMobileDevice && upgradeScreen === 3)) && (
                    <div className="flex flex-col items-center sm:gap-2 w-full">
                      <p className="text-xl lg:text-2xl sm:hidden">
                        Loot Fountain
                      </p>
                      <MarketplaceScreen
                        upgradeTotalCost={upgradeTotalCost}
                        purchaseItems={purchaseItems}
                        setPurchaseItems={setPurchaseItems}
                        upgradeHandler={handleAddItemsAndTx}
                        totalCharisma={totalCharisma}
                      />
                    </div>
                  )}
                  <div className="w-1/2 flex flex-row gap-2 mx-auto">
                    <Button
                      className="w-1/2"
                      variant={"outline"}
                      onClick={() => setUpgradeScreen(upgradeScreen - 1)}
                      disabled={upgradeScreen == 1}
                    >
                      Back
                    </Button>
                    <Button
                      className="w-1/2"
                      onClick={() => {
                        if (
                          isMobileDevice
                            ? upgradeScreen == 3
                            : upgradeScreen == 2
                        ) {
                          handleBuyItemsAndUpgradeTx();
                        } else {
                          setUpgradeScreen(upgradeScreen + 1);
                        }
                      }}
                      disabled={nextDisabled || loading}
                    >
                      {loading ? "Upgrading..." : lastPage ? "Upgrade" : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 items-center animate-pulse w-2/3 sm:w-full">
              <h3 className="mx-auto">Upgrading</h3>
              <p className="text-2xl">Stat Increases:</p>
              {Object.entries(summary["Stats"]).map(([key, value]) => (
                <div className="flex flex-row gap-2 items-center" key={key}>
                  <span className="w-10 h-10">
                    {attributes.find((a) => a.name === key)?.icon}
                  </span>
                  <p className="text-no-wrap uppercase text-lg">{`${key} x ${value}`}</p>
                </div>
              ))}
              {(summary["Items"].length > 0 || summary["Potions"] > 0) && (
                <p className="text-2xl">Item Purchases:</p>
              )}
              {summary["Items"].length > 0 && (
                <>
                  {summary["Items"].map((item: ItemPurchase, index: number) => {
                    const { slot } = getItemData(
                      getValueFromKey(gameData.ITEMS, parseInt(item.item)) ?? ""
                    );
                    return (
                      <div
                        className="flex flex-row gap-2 items-center"
                        key={index}
                      >
                        <LootIcon
                          size={isMobileDevice ? "w-4" : "w-5"}
                          type={slot}
                        />
                        <p className="text-lg">
                          {getValueFromKey(gameData.ITEMS, parseInt(item.item))}
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
              {summary["Potions"] > 0 && (
                <div className="flex flex-row gap-2 items-center">
                  <HealthPotionIcon />
                  <p className="text-lg">{`Health Potions x ${summary["Potions"]}`}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <h1 className="mx-auto">No upgrades available!</h1>
      )}
    </>
  );
}
