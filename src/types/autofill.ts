export type GetAutofill = {
    company_name: string;
    job: {
        id: string;
        status: string;
        result: {
            type: string;
            design: {
                id: string;
                title: string;
                url: string;
                thumbnail: {
                    url: string;
                };
                urls: {
                    edit_url: string;
                    view_url: string;
                };
                created_at: number;
                updated_at: number;
            };
        };
    };
};

export type CreateAutofill = {
    company_name: string;
    job: {
        id: string;
        status: string;
    };
};


export type TemplateDataset = {
    title: string;
    id: string;
    dataset: any;
}