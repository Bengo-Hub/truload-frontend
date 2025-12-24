"use client";

import { fetchDepartments } from '@/lib/api/setup';
import type { DepartmentDto } from '@/types/setup';
import { useQuery } from '@tanstack/react-query';

export default function DepartmentsTab() {
  const { data: departments = [], isLoading } = useQuery<DepartmentDto[]>({ queryKey: ['departments'], queryFn: () => fetchDepartments() });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Departments</h3>
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className="text-sm text-gray-500">No departments found.</div>
      ) : (
        <ul className="space-y-1">
          {departments.map((dept) => (
            <li key={dept.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-800">{dept.name}</span>
              {dept.description && <span className="text-xs text-gray-500">{dept.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
