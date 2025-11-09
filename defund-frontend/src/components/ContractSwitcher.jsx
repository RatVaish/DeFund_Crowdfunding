import { CONTRACT_VERSIONS } from "../contracts/config";

function ContractSwitcher({ currentVersion, onVersionChange }) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">Contract Version</h3>
          <p className="text-sm text-blue-100">
            {CONTRACT_VERSIONS[currentVersion].features.join(" • ")}
          </p>
        </div>

        <div className="flex gap-2">
          {Object.keys(CONTRACT_VERSIONS).map((version) => (
            <button
              key={version}
              onClick={() => onVersionChange(version)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                currentVersion === version
                  ? "bg-white text-blue-600"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {CONTRACT_VERSIONS[version].name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20">
        <p className="text-xs text-blue-100">
          Active Contract: {CONTRACT_VERSIONS[currentVersion].address}
        </p>
      </div>
    </div>
  );
}

export default ContractSwitcher;
