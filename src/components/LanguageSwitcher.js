import React from 'react';
import { Button, ButtonGroup, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ inMenu = false }) => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  if (inMenu) {
    return (
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Language
        </Typography>
        <ButtonGroup size="small" variant="outlined" fullWidth>
          <Button
            onClick={() => changeLanguage('ko')}
            variant={i18n.language === 'ko' ? 'contained' : 'outlined'}
            sx={{ 
              fontSize: '0.75rem',
              fontWeight: i18n.language === 'ko' ? 600 : 400,
              flex: 1
            }}
          >
            한국어
          </Button>
          <Button
            onClick={() => changeLanguage('en')}
            variant={i18n.language === 'en' ? 'contained' : 'outlined'}
            sx={{ 
              fontSize: '0.75rem',
              fontWeight: i18n.language === 'en' ? 600 : 400,
              flex: 1
            }}
          >
            English
          </Button>
        </ButtonGroup>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ButtonGroup size="small" variant="outlined">
        <Button
          onClick={() => changeLanguage('ko')}
          variant={i18n.language === 'ko' ? 'contained' : 'outlined'}
          sx={{ 
            minWidth: '40px',
            fontSize: '0.75rem',
            fontWeight: i18n.language === 'ko' ? 600 : 400
          }}
        >
          한국어
        </Button>
        <Button
          onClick={() => changeLanguage('en')}
          variant={i18n.language === 'en' ? 'contained' : 'outlined'}
          sx={{ 
            minWidth: '40px',
            fontSize: '0.75rem',
            fontWeight: i18n.language === 'en' ? 600 : 400
          }}
        >
          English
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default LanguageSwitcher;