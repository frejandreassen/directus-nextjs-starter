"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import auth from "@/lib/auth";
import { refreshCredentials } from "@/lib/directus";

export default function Home() {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  const [credentials, setCredentials] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const router = useRouter();

  const fetchData = async () => {
    try {
      let credentials = auth.getCredentials();
      setCredentials(credentials);
      if (!credentials) router.push("/login");
      if (credentials.expires_at - 1000 * 60 * 5 < new Date().getTime()) {
        console.log("Refreshing credentials");
        const refreshedCredentials = await refreshCredentials(
          credentials.refresh_token,
        );
        auth.setCredentials(refreshedCredentials);
        setCredentials(refreshedCredentials);
        credentials = refreshedCredentials;
      }

      const res = await fetch(
        url + "/items/product_list?access_token=" + credentials.access_token,
      );
      if (!res.ok) throw Error("Failed to fetch data");
      const data = await res.json();
      setProducts(data.data);
      setIsLoading(false);
    } catch (error) {
      console.log("Error fetching data:", error);

      router.push("/login");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid grid-rows-[20px_1fr_20px] min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <button onClick={fetchData}>Refresh</button>
      <div>{new Date(credentials.expires_at).toLocaleString()}</div>
      <div>
        {new Date(credentials.expires_at - 1000 * 60 * 5).toLocaleString()}
      </div>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Quantity
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">
                  Product Name
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50"
                >
                  <td className="p-4 align-middle font-medium">
                    {product.Quantity}
                  </td>
                  <td className="p-4 align-middle">{product.ProductName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {products.length === 0 && (
        <div className="text-center text-sm text-gray-500">
          No products found
        </div>
      )}
    </div>
  );
}
