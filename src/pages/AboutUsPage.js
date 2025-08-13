import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Grid, Chip, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Event, CalendarMonth, Share, Edit, Security, AccessTime, CloudOff, Delete } from '@mui/icons-material';
import SuggestionDialog from '../components/SuggestionDialog';

const AboutUsPage = () => {
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const howToSteps = [
    {
      label: 'TimeCheck 이벤트 생성',
      icon: <Event />,
      description: '날짜 범위와 시간대를 선택하여 새로운 이벤트를 만드세요.'
    },
    {
      label: '캘린더 연동해서 일정 자동 입력',
      icon: <CalendarMonth />,
      description: 'Google Calendar 또는 Apple Calendar를 연동하여 기존 일정을 자동으로 불러옵니다.'
    },
    {
      label: '링크 공유',
      icon: <Share />,
      description: '생성된 링크를 참가자들에게 공유하여 일정 조율을 시작하세요.'
    },
    {
      label: '최적 시간 캘린더에 쓰기',
      icon: <Edit />,
      description: '모든 참가자가 가능한 최적의 시간을 찾아 캘린더에 바로 추가하세요.'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <img 
          src="/timechecklogo.svg"
          alt="TimeCheck" 
          style={{ 
            height: '60px', 
            width: 'auto', 
            objectFit: 'contain',
            marginBottom: '24px'
          }} 
        />
        
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            maxWidth: 600, 
            mx: 'auto', 
            mb: 3
          }}
        >
          캘린더 왔다갔다 하지 않고 쉽고 빠르게 모임 일정 정하기
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1,
          flexWrap: 'wrap'
        }}>
          <Chip label="100% 무료" color="primary" />
          <Chip label="캘린더 연동" color="primary" variant="outlined" />
          <Chip label="캘린더에 일정 쓰기" color="primary" variant="outlined" />
        </Box>
      </Box>

      {/* Main GIF Section */}
      <Box sx={{ mb: 6 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4,
            backgroundColor: 'grey.50',
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            textAlign: 'center',
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            [GIF placeholder - TimeCheck 사용 예시]
          </Typography>
        </Paper>
      </Box>

      {/* How to Use Section */}
      <Box sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
        <Typography 
          variant="h5" 
          fontWeight={600} 
          sx={{ mb: 4, textAlign: 'center' }}
        >
          사용 방법
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {howToSteps.map((step, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 2,
                width: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {index + 1}
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Data Transparency Section */}
      <Box sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
        <Typography 
          variant="h5" 
          fontWeight={600} 
          sx={{ mb: 4, textAlign: 'center' }}
        >
          데이터 사용 및 보안
        </Typography>
        
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper'
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            TimeCheck가 요청하는 데이터와 사용 목적
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CalendarMonth color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="캘린더 일정 읽기"
                secondary="기존 일정을 확인하여 불가능한 시간을 자동으로 표시합니다. 일정의 제목과 시간만 읽으며, 상세 내용은 접근하지 않습니다."
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Edit color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="캘린더 일정 쓰기"
                secondary="그룹에서 결정된 최종 일정을 사용자의 캘린더에 추가합니다. 사용자가 명시적으로 '캘린더에 쓰기' 버튼을 클릭했을 때만 작동합니다."
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AccessTime color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="일시적 접근"
                secondary="캘린더 데이터는 일정 조율 세션 중에만 일시적으로 접근되며, 세션이 종료되면 즉시 메모리에서 삭제됩니다."
              />
            </ListItem>
          </List>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3, mb: 2 }}>
            데이터 보안 및 프라이버시
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Security color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="암호화된 전송"
                secondary="모든 데이터는 HTTPS를 통해 암호화되어 전송됩니다."
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <CloudOff color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="최소한의 데이터 저장"
                secondary="캘린더 일정 내용은 서버에 저장되지 않으며, 오직 사용자가 선택한 가능/불가능 시간대만 저장됩니다."
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Delete color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="데이터 삭제 권한"
                secondary="사용자는 언제든지 자신의 데이터를 삭제할 수 있으며, 이벤트가 종료되면 관련 데이터는 자동으로 삭제됩니다."
              />
            </ListItem>
          </List>
        </Paper>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        textAlign: 'center', 
        pt: 4, 
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          문의사항은{' '}
          <Typography
            component="span"
            variant="caption"
            onClick={() => setSuggestionDialogOpen(true)}
            sx={{ 
              color: '#64b5f6',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Feedback
          </Typography>
        </Typography>
      </Box>
      
      <SuggestionDialog
        open={suggestionDialogOpen}
        onClose={() => setSuggestionDialogOpen(false)}
      />
    </Container>
  );
};

export default AboutUsPage;