import * as React from "react";

export type SortDirection = "asc" | "desc" | "none";

// Helper functions to reduce Cognitive Complexity
const handleNullValues = (valueA: unknown, valueB: unknown, sortDirection: SortDirection) => {
  if (valueA === null || valueA === undefined) {
    return sortDirection === "asc" ? -1 : 1;
  }
  if (valueB === null || valueB === undefined) {
    return sortDirection === "asc" ? 1 : -1;
  }
  return null; // Not null values
};

const compareStrings = (valueA: string, valueB: string, sortDirection: SortDirection) => {
  return sortDirection === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
};

const compareOtherTypes = (valueA: unknown, valueB: unknown, sortDirection: SortDirection) => {
  // Type assertion for safe comparison
  const a = valueA as string | number;
  const b = valueB as string | number;

  if (a < b) {
    return sortDirection === "asc" ? -1 : 1;
  }
  if (a > b) {
    return sortDirection === "asc" ? 1 : -1;
  }
  return 0;
};

// Helper functions return string instead of JSX
const getSortIconType = (column: string, sortField: string | null, sortOrder: string) => {
  if (column !== sortField) return "none";
  if (sortOrder === "asc") return "asc";
  return "desc";
};

const getAriaLabel = (column: string, sortField: string | null, sortOrder: string) => {
  if (column !== sortField) return `Sort by ${column}`;
  if (sortOrder === "asc") return `Sort by ${column} descending`;
  return `Sort by ${column} ascending`;
};

/**
 * A hook to manage sortable data collections
 *
 * @example
 * const { sortedData, getSortProps } = useSortable(users);
 * return (
 *   <Table>
 *     <TableHeader>
 *       <TableHead {...getSortProps('name')}>Name</TableHead>
 *       <TableHead {...getSortProps('email')}>Email</TableHead>
 *     </TableHeader>
 *     <TableBody>
 *       {sortedData.map(user => (
 *         <TableRow key={user.id}>
 *           <TableCell>{user.name}</TableCell>
 *           <TableCell>{user.email}</TableCell>
 *         </TableRow>
 *       ))}
 *     </TableBody>
 *   </Table>
 * );
 */
export function useSortable<T>(initialData: T[]) {
  const [sortKey, setSortKey] = React.useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("none");

  // Sort the data based on current sort configuration
  // Default: reverse order (newest first) when no sort is applied
  const sortedData = React.useMemo(() => {
    if (sortDirection === "none" || !sortKey) {
      return [...initialData].reverse();
    }

    return [...initialData].sort((a, b) => {
      const valueA = a[sortKey];
      const valueB = b[sortKey];

      // Handle null/undefined values first
      const nullComparison = handleNullValues(valueA, valueB, sortDirection);
      if (nullComparison !== null) {
        return nullComparison;
      }

      // Handle different types
      if (typeof valueA === "string" && typeof valueB === "string") {
        return compareStrings(valueA, valueB, sortDirection);
      }

      // Handle numbers and other comparable types
      return compareOtherTypes(valueA, valueB, sortDirection);
    });
  }, [initialData, sortKey, sortDirection]);

  // Generate props for SortButton components
  const getSortProps = (key: keyof T) => ({
    direction: sortKey === key ? sortDirection : ("none" as SortDirection),
    onChange: (direction: SortDirection) => {
      setSortKey(direction === "none" ? null : key);
      setSortDirection(direction);
    },
  });

  // Handle sort toggle (simpler API for column headers)
  const toggleSort = (key: keyof T) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection("none");
    } else {
      setSortDirection("asc");
    }
  };

  return {
    sortedData,
    sortKey,
    sortDirection,
    getSortProps,
    toggleSort,
    getSortIconType,
    getAriaLabel,
  };
}
